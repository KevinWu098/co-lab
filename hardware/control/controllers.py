import asyncio
import contextlib
import importlib
import io
import logging
import math
import time
from typing import Any, Awaitable, Callable

from .constants import (
    RIG_BASE_ROTATION_CHANNEL,
    RIG_BASE_ROTATION_POSITIONS,
    RIG_CLOSED_ANGLE,
    RIG_DEFAULT_ANGLE,
    RIG_DIAGNOSTIC_BASE_TO_VALVE_DELAY_S,
    RIG_INIT_SERVOS_ON_START,
    RIG_OPEN_ANGLE,
    RIG_SERVO_ACTUATION_RANGE,
    RIG_SERVO_CHANNELS,
    RIG_SERVO_MAX_PULSE_US,
    RIG_SERVO_MIN_PULSE_US,
    RIG_STIRRER_CHIP,
    RIG_STIRRER_DURATIONS_S,
    RIG_STIRRER_GPIO,
    THERMAL_FALLBACK_INTERVAL_S,
    THERMAL_FRAME_HEIGHT,
    THERMAL_FRAME_SCALE,
    THERMAL_FRAME_WIDTH,
    THERMAL_HTTP_PORT,
    THERMAL_JPEG_QUALITY,
    THERMAL_CAPTURE_ERROR_LOG_INTERVAL_S,
    THERMAL_CAPTURE_INTERVAL_S,
    THERMAL_READ_RETRIES,
    THERMAL_READ_RETRY_DELAY_S,
    THERMAL_STREAM_PATH,
    THERMAL_TEXT_BAND_HEIGHT,
    THERMAL_WS_BROADCAST_INTERVAL_S,
    WEBCAM_CAPTURE_ERROR_LOG_INTERVAL_S,
    WEBCAM_CAPTURE_INTERVAL_S,
    WEBCAM_DEVICE_INDEX,
    WEBCAM_FALLBACK_INTERVAL_S,
    WEBCAM_FRAME_HEIGHT,
    WEBCAM_FRAME_WIDTH,
    WEBCAM_JPEG_QUALITY,
    WEBCAM_STREAM_PATH,
    WEBCAM_WS_BROADCAST_INTERVAL_S,
    XARM_DEFAULT_MOVE_MS,
    XARM_MAX_ANGLE_DEG,
    XARM_MAX_MOVE_MS,
    XARM_MIN_ANGLE_DEG,
    XARM_MIN_MOVE_MS,
    XARM_RAW_MAX,
    XARM_RAW_MIN,
    XARM_SAFE_READ_DELAY_S,
    XARM_SAFE_READ_RETRIES,
    XARM_SERVO_IDS,
)


def clamp_int(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def clamp_float(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def xarm_raw_to_angle_deg(raw: int) -> float:
    clamped_raw = clamp_int(raw, XARM_RAW_MIN, XARM_RAW_MAX)
    raw_span = XARM_RAW_MAX - XARM_RAW_MIN
    if raw_span <= 0:
        return XARM_MIN_ANGLE_DEG
    normalized = (clamped_raw - XARM_RAW_MIN) / raw_span
    return XARM_MIN_ANGLE_DEG + normalized * (XARM_MAX_ANGLE_DEG - XARM_MIN_ANGLE_DEG)


def xarm_angle_deg_to_raw(angle_deg: float) -> int:
    clamped_angle = clamp_float(angle_deg, XARM_MIN_ANGLE_DEG, XARM_MAX_ANGLE_DEG)
    angle_span = XARM_MAX_ANGLE_DEG - XARM_MIN_ANGLE_DEG
    if angle_span <= 0:
        return XARM_RAW_MIN
    normalized = (clamped_angle - XARM_MIN_ANGLE_DEG) / angle_span
    raw = XARM_RAW_MIN + normalized * (XARM_RAW_MAX - XARM_RAW_MIN)
    return clamp_int(int(round(raw)), XARM_RAW_MIN, XARM_RAW_MAX)


def parse_xarm_position_response(raw: Any) -> int | None:
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int) and XARM_RAW_MIN <= raw <= XARM_RAW_MAX:
        return raw
    if isinstance(raw, (tuple, list)) and len(raw) >= 2:
        code, position = raw[0], raw[1]
        if (
            code in (0, True)
            and isinstance(position, int)
            and XARM_RAW_MIN <= position <= XARM_RAW_MAX
        ):
            return position
    return None


class XArmController:
    def __init__(self) -> None:
        midpoint = (XARM_RAW_MIN + XARM_RAW_MAX) // 2
        self.positions = {servo_id: midpoint for servo_id in XARM_SERVO_IDS}
        self.startup_centers = {servo_id: midpoint for servo_id in XARM_SERVO_IDS}
        self.online_ids: set[int] = set()
        self.lock = asyncio.Lock()
        self.available = False
        self.error: str | None = None
        self.arm: Any | None = None

        try:
            xarm_module = importlib.import_module("xarm")
            self.arm = xarm_module.Controller("USB")
            self.available = True
        except Exception as exc:
            self.error = str(exc)
            logging.exception("xArm initialization failed")

    def _ensure_available(self) -> None:
        if not self.available or self.arm is None:
            suffix = f":{self.error}" if self.error else ""
            raise RuntimeError(f"xarm_unavailable{suffix}")

    def state_payload(self) -> dict[str, Any]:
        servos_payload = []
        for servo_id in XARM_SERVO_IDS:
            raw_position = self.positions[servo_id]
            raw_center = self.startup_centers[servo_id]
            angle_deg = round(xarm_raw_to_angle_deg(raw_position), 1)
            center_deg = round(xarm_raw_to_angle_deg(raw_center), 1)
            servos_payload.append(
                {
                    "id": servo_id,
                    "angleDeg": angle_deg,
                    "centerDeg": center_deg,
                    # Keep legacy keys with degree units for older clients.
                    "position": angle_deg,
                    "center": center_deg,
                    "rawPosition": raw_position,
                    "rawCenter": raw_center,
                    "online": servo_id in self.online_ids,
                }
            )

        return {
            "available": self.available,
            "error": self.error,
            "servos": servos_payload,
            "limits": {"min": XARM_MIN_ANGLE_DEG, "max": XARM_MAX_ANGLE_DEG},
            "rawLimits": {"min": XARM_RAW_MIN, "max": XARM_RAW_MAX},
            "defaults": {"moveMs": XARM_DEFAULT_MOVE_MS},
            "onlineIds": sorted(self.online_ids),
        }

    async def safe_get_position(self, servo_id: int) -> int | None:
        self._ensure_available()
        for _ in range(XARM_SAFE_READ_RETRIES):
            try:
                raw = await asyncio.to_thread(self.arm.getPosition, servo_id)
            except Exception:
                raw = None
            parsed = parse_xarm_position_response(raw)
            if parsed is not None:
                return parsed
            await asyncio.sleep(XARM_SAFE_READ_DELAY_S)
        return None

    async def scan(self) -> None:
        self._ensure_available()
        online: set[int] = set()
        for servo_id in XARM_SERVO_IDS:
            position = await self.safe_get_position(servo_id)
            if position is None:
                continue
            self.positions[servo_id] = clamp_int(position, XARM_RAW_MIN, XARM_RAW_MAX)
            online.add(servo_id)
        self.online_ids = online

    async def capture_startup_centers(self) -> None:
        if not self.available:
            return
        await self.scan()
        for servo_id in self.online_ids:
            self.startup_centers[servo_id] = self.positions[servo_id]

    async def set_position(
        self,
        servo_id: int,
        angle_deg: float,
        move_ms: int,
        wait: bool = False,
    ) -> tuple[float, int]:
        self._ensure_available()
        if servo_id not in XARM_SERVO_IDS:
            raise ValueError("invalid_id")

        target_raw = xarm_angle_deg_to_raw(angle_deg)
        duration = clamp_int(move_ms, XARM_MIN_MOVE_MS, XARM_MAX_MOVE_MS)

        async with self.lock:
            await asyncio.to_thread(
                self.arm.setPosition,
                servo_id,
                target_raw,
                duration,
                wait,
            )

        self.positions[servo_id] = target_raw
        self.online_ids.add(servo_id)
        return round(xarm_raw_to_angle_deg(target_raw), 1), duration

    async def set_many(self, targets: dict[int, float], move_ms: int) -> int:
        duration = clamp_int(move_ms, XARM_MIN_MOVE_MS, XARM_MAX_MOVE_MS)
        for servo_id, angle_deg in targets.items():
            await self.set_position(servo_id, angle_deg, duration, wait=False)
        return duration

    async def recenter(self, move_ms: int) -> int:
        duration = clamp_int(move_ms, XARM_MIN_MOVE_MS, XARM_MAX_MOVE_MS)
        for servo_id in XARM_SERVO_IDS:
            center_angle_deg = xarm_raw_to_angle_deg(self.startup_centers[servo_id])
            await self.set_position(
                servo_id,
                center_angle_deg,
                duration,
                wait=False,
            )
        return duration


class RigController:
    def __init__(self) -> None:
        self.available = False
        self.error: str | None = None
        self.servo_angles = [RIG_DEFAULT_ANGLE] * RIG_SERVO_CHANNELS
        self.stirrer_active = False

        self.servos: list[Any] = []
        self.lgpio: Any | None = None
        self.gpio_handle: Any | None = None

        try:
            board = importlib.import_module("board")
            busio = importlib.import_module("busio")
            servo_module = importlib.import_module("adafruit_motor.servo")
            pca9685_module = importlib.import_module("adafruit_pca9685")
            self.lgpio = importlib.import_module("lgpio")

            i2c = busio.I2C(board.SCL, board.SDA)
            pca = pca9685_module.PCA9685(i2c)
            pca.frequency = 50

            self.gpio_handle = self.lgpio.gpiochip_open(RIG_STIRRER_CHIP)
            self.lgpio.gpio_claim_output(self.gpio_handle, RIG_STIRRER_GPIO, 0)

            self.servos = [
                servo_module.Servo(
                    pca.channels[index],
                    min_pulse=RIG_SERVO_MIN_PULSE_US,
                    max_pulse=RIG_SERVO_MAX_PULSE_US,
                    actuation_range=RIG_SERVO_ACTUATION_RANGE,
                )
                for index in range(RIG_SERVO_CHANNELS)
            ]

            if RIG_INIT_SERVOS_ON_START:
                for index, angle in enumerate(self.servo_angles):
                    self.servos[index].angle = angle
            else:
                self._sync_servo_angles_from_outputs()

            self.available = True
        except Exception as exc:
            self.error = str(exc)
            logging.exception("rig initialization failed")

    def _ensure_available(self) -> None:
        if not self.available:
            suffix = f":{self.error}" if self.error else ""
            raise RuntimeError(f"rig_unavailable{suffix}")

    def state_payload(self) -> dict[str, Any]:
        return {
            "available": self.available,
            "error": self.error,
            "channels": self.servo_angles,
            "baseChannel": RIG_BASE_ROTATION_CHANNEL,
            "basePositions": list(RIG_BASE_ROTATION_POSITIONS),
            "closedAngle": RIG_CLOSED_ANGLE,
            "openAngle": RIG_OPEN_ANGLE,
            "diagnosticBaseToValveDelayS": RIG_DIAGNOSTIC_BASE_TO_VALVE_DELAY_S,
            "stirrerDurations": list(RIG_STIRRER_DURATIONS_S),
            "stirrerActive": self.stirrer_active,
        }

    def clamp_angle_for_channel(self, channel: int, angle: float) -> float:
        if channel == RIG_BASE_ROTATION_CHANNEL:
            return min(RIG_BASE_ROTATION_POSITIONS, key=lambda pos: abs(pos - angle))
        clamped = max(RIG_CLOSED_ANGLE, min(RIG_OPEN_ANGLE, angle))
        return RIG_OPEN_ANGLE if clamped >= (RIG_OPEN_ANGLE / 2) else RIG_CLOSED_ANGLE

    def _sync_servo_angles_from_outputs(self) -> None:
        for channel, rig_servo in enumerate(self.servos):
            try:
                raw_angle = rig_servo.angle
            except Exception:
                continue

            if raw_angle is None:
                continue

            try:
                normalized = self.clamp_angle_for_channel(channel, float(raw_angle))
            except (TypeError, ValueError):
                continue

            self.servo_angles[channel] = normalized

    def set_channel_immediate(self, channel: int, angle: float) -> None:
        self._ensure_available()
        self.servos[channel].angle = angle
        self.servo_angles[channel] = angle

    async def move_base_servo(self, target: float) -> None:
        self._ensure_available()
        self.servos[RIG_BASE_ROTATION_CHANNEL].angle = target
        self.servo_angles[RIG_BASE_ROTATION_CHANNEL] = target

    async def run_stirrer(self, duration: float) -> None:
        self._ensure_available()
        if self.lgpio is None or self.gpio_handle is None:
            raise RuntimeError("rig_unavailable:stirrer_not_initialized")

        self.stirrer_active = True
        try:
            self.lgpio.gpio_write(self.gpio_handle, RIG_STIRRER_GPIO, 1)
            await asyncio.sleep(duration)
        finally:
            self.lgpio.gpio_write(self.gpio_handle, RIG_STIRRER_GPIO, 0)
            self.stirrer_active = False

    def force_stirrer_off(self) -> None:
        self.stirrer_active = False
        if not self.available or self.lgpio is None or self.gpio_handle is None:
            return
        try:
            self.lgpio.gpio_write(self.gpio_handle, RIG_STIRRER_GPIO, 0)
        except Exception:
            logging.exception("failed to force stirrer off")

    def close_non_base_servos(self) -> None:
        self._ensure_available()
        for channel in range(RIG_SERVO_CHANNELS):
            if channel == RIG_BASE_ROTATION_CHANNEL:
                continue
            self.servos[channel].angle = RIG_CLOSED_ANGLE
            self.servo_angles[channel] = RIG_CLOSED_ANGLE


class ThermalController:
    def __init__(self) -> None:
        self.available = False
        self.error: str | None = None
        self.sensor: Any | None = None
        self.frame_buffer: list[float] = [0.0] * (THERMAL_FRAME_WIDTH * THERMAL_FRAME_HEIGHT)
        self.image_module: Any | None = None
        self.image_draw_module: Any | None = None

        self.frame_counter = 0
        self.last_updated_ms: int | None = None
        self.max_temp_c: float | None = None
        self.min_temp_c: float | None = None
        self.fps: float | None = None
        self.latest_jpeg: bytes | None = None
        self.frame_condition = asyncio.Condition()
        self.capture_task: asyncio.Task | None = None
        self.last_frame_monotonic: float | None = None
        self.last_broadcast_monotonic = 0.0
        self.last_capture_error_log_monotonic = 0.0
        self.on_thermal_update: Callable[[], Awaitable[None]] | None = None
        self.pause_reasons: set[str] = set()

        try:
            board = importlib.import_module("board")
            busio = importlib.import_module("busio")
            mlx_module = importlib.import_module("adafruit_mlx90640")
            self.image_module = importlib.import_module("PIL.Image")
            self.image_draw_module = importlib.import_module("PIL.ImageDraw")

            i2c = busio.I2C(board.SCL, board.SDA)
            self.sensor = mlx_module.MLX90640(i2c)
            if hasattr(mlx_module, "RefreshRate"):
                if hasattr(mlx_module.RefreshRate, "REFRESH_4_HZ"):
                    self.sensor.refresh_rate = mlx_module.RefreshRate.REFRESH_4_HZ
                else:
                    self.sensor.refresh_rate = mlx_module.RefreshRate.REFRESH_8_HZ
            self.available = True
        except Exception as exc:
            self.error = str(exc)
            logging.exception("thermal initialization failed")

    @staticmethod
    def _temperature_to_rgb(normalized: float) -> tuple[int, int, int]:
        clamped = max(0.0, min(1.0, normalized))
        anchors = [
            (0.0, (0, 0, 20)),
            (0.2, (20, 20, 180)),
            (0.4, (0, 180, 255)),
            (0.6, (255, 255, 0)),
            (0.8, (255, 80, 0)),
            (1.0, (255, 255, 255)),
        ]
        for index in range(1, len(anchors)):
            left_t, left_color = anchors[index - 1]
            right_t, right_color = anchors[index]
            if clamped <= right_t:
                ratio = (clamped - left_t) / (right_t - left_t) if right_t > left_t else 0.0
                red = int(left_color[0] + (right_color[0] - left_color[0]) * ratio)
                green = int(left_color[1] + (right_color[1] - left_color[1]) * ratio)
                blue = int(left_color[2] + (right_color[2] - left_color[2]) * ratio)
                return red, green, blue
        return anchors[-1][1]

    def _read_frame(self) -> list[float] | None:
        if self.sensor is None:
            return None
        for _ in range(THERMAL_READ_RETRIES):
            try:
                self.sensor.getFrame(self.frame_buffer)
                return list(self.frame_buffer)
            except ValueError:
                time.sleep(THERMAL_READ_RETRY_DELAY_S)
                continue
            except RuntimeError as exc:
                if "Too many retries" in str(exc):
                    time.sleep(THERMAL_READ_RETRY_DELAY_S)
                    continue
                raise
            except Exception:
                raise
        return None

    def _log_capture_error(self, message: str, exc_info: bool = False) -> None:
        now_monotonic = time.monotonic()
        if now_monotonic - self.last_capture_error_log_monotonic < THERMAL_CAPTURE_ERROR_LOG_INTERVAL_S:
            return
        self.last_capture_error_log_monotonic = now_monotonic
        if exc_info:
            logging.exception(message)
        else:
            logging.warning(message)

    def _build_jpeg_frame(self, frame: list[float]) -> tuple[bytes, float, float]:
        if self.image_module is None or self.image_draw_module is None:
            raise RuntimeError("thermal_unavailable:image_lib_missing")

        finite_values = [value for value in frame if math.isfinite(value)]
        if not finite_values:
            finite_values = [0.0]
        min_temp = min(finite_values)
        max_temp = max(finite_values)
        span = max(max_temp - min_temp, 0.01)

        pixels = [
            self._temperature_to_rgb((value - min_temp) / span)
            if math.isfinite(value)
            else (0, 0, 0)
            for value in frame
        ]

        image = self.image_module.new("RGB", (THERMAL_FRAME_WIDTH, THERMAL_FRAME_HEIGHT))
        image.putdata(pixels)
        if hasattr(self.image_module, "Transpose"):
            image = image.transpose(self.image_module.Transpose.FLIP_LEFT_RIGHT)
        else:
            image = image.transpose(self.image_module.FLIP_LEFT_RIGHT)
        if hasattr(self.image_module, "Resampling"):
            image = image.resize(
                (THERMAL_FRAME_WIDTH * THERMAL_FRAME_SCALE, THERMAL_FRAME_HEIGHT * THERMAL_FRAME_SCALE),
                self.image_module.Resampling.NEAREST,
            )
        else:
            image = image.resize(
                (THERMAL_FRAME_WIDTH * THERMAL_FRAME_SCALE, THERMAL_FRAME_HEIGHT * THERMAL_FRAME_SCALE),
                self.image_module.NEAREST,
            )

        draw = self.image_draw_module.Draw(image)
        draw.rectangle(
            (0, 0, image.width, THERMAL_TEXT_BAND_HEIGHT),
            fill=(0, 0, 0),
        )
        draw.text(
            (6, 6),
            f"max {max_temp:.1f}C min {min_temp:.1f}C",
            fill=(255, 255, 255),
        )

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=THERMAL_JPEG_QUALITY)
        return buffer.getvalue(), min_temp, max_temp

    def thermal_payload(self) -> dict[str, Any]:
        return {
            "type": "thermal",
            "subsystem": "thermal",
            "available": self.available,
            "error": self.error,
            "frameId": self.frame_counter,
            "maxTempC": self.max_temp_c,
            "minTempC": self.min_temp_c,
            "fps": self.fps,
            "updatedAtMs": self.last_updated_ms,
            "streamPath": THERMAL_STREAM_PATH,
            "httpPort": THERMAL_HTTP_PORT,
        }

    def state_payload(self) -> dict[str, Any]:
        payload = self.thermal_payload()
        payload.pop("type", None)
        payload.pop("subsystem", None)
        return payload

    async def start(self) -> None:
        if not self.available:
            return
        if self.capture_task and not self.capture_task.done():
            return
        self.capture_task = asyncio.create_task(self._capture_loop())

    async def stop(self) -> None:
        if self.capture_task is None or self.capture_task.done():
            return
        self.capture_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self.capture_task

    async def _capture_loop(self) -> None:
        next_capture_at = 0.0
        while True:
            try:
                if self.pause_reasons:
                    await asyncio.sleep(THERMAL_FALLBACK_INTERVAL_S)
                    continue

                now = time.monotonic()
                if now < next_capture_at:
                    await asyncio.sleep(next_capture_at - now)
                    continue
                next_capture_at = now + THERMAL_CAPTURE_INTERVAL_S

                frame = await asyncio.to_thread(self._read_frame)
                if frame is None:
                    self._log_capture_error(
                        "thermal frame retry exhausted; continuing",
                        exc_info=False,
                    )
                    await asyncio.sleep(THERMAL_FALLBACK_INTERVAL_S)
                    continue

                jpeg, min_temp, max_temp = await asyncio.to_thread(self._build_jpeg_frame, frame)
                now_monotonic = time.monotonic()
                now_ms = int(time.time() * 1000)

                if self.last_frame_monotonic is not None:
                    delta = max(now_monotonic - self.last_frame_monotonic, 1e-3)
                    current_fps = 1.0 / delta
                    if self.fps is None:
                        self.fps = current_fps
                    else:
                        self.fps = (self.fps * 0.8) + (current_fps * 0.2)
                self.last_frame_monotonic = now_monotonic

                async with self.frame_condition:
                    self.frame_counter += 1
                    self.latest_jpeg = jpeg
                    self.min_temp_c = min_temp
                    self.max_temp_c = max_temp
                    self.last_updated_ms = now_ms
                    self.frame_condition.notify_all()

                if (
                    self.on_thermal_update is not None
                    and now_monotonic - self.last_broadcast_monotonic >= THERMAL_WS_BROADCAST_INTERVAL_S
                ):
                    self.last_broadcast_monotonic = now_monotonic
                    await self.on_thermal_update()
            except asyncio.CancelledError:
                raise
            except Exception:
                self._log_capture_error("thermal capture failure", exc_info=True)
                await asyncio.sleep(THERMAL_FALLBACK_INTERVAL_S)

    def set_paused(self, reason: str, paused: bool) -> None:
        if paused:
            self.pause_reasons.add(reason)
            return
        self.pause_reasons.discard(reason)

    async def wait_for_frame(
        self,
        last_seen_frame_id: int,
        timeout_s: float = 5.0,
    ) -> tuple[int, bytes, float, float, int | None, float | None] | None:
        async with self.frame_condition:
            if self.frame_counter <= last_seen_frame_id:
                try:
                    await asyncio.wait_for(self.frame_condition.wait(), timeout_s)
                except TimeoutError:
                    return None

            if self.latest_jpeg is None or self.min_temp_c is None or self.max_temp_c is None:
                return None

            return (
                self.frame_counter,
                self.latest_jpeg,
                self.min_temp_c,
                self.max_temp_c,
                self.last_updated_ms,
                self.fps,
            )


class WebcamController:
    def __init__(self) -> None:
        self.available = False
        self.error: str | None = None
        self.cv2: Any | None = None
        self.capture: Any | None = None

        self.frame_counter = 0
        self.last_updated_ms: int | None = None
        self.fps: float | None = None
        self.latest_jpeg: bytes | None = None
        self.frame_condition = asyncio.Condition()
        self.capture_task: asyncio.Task | None = None
        self.last_frame_monotonic: float | None = None
        self.last_broadcast_monotonic = 0.0
        self.last_capture_error_log_monotonic = 0.0
        self.on_webcam_update: Callable[[], Awaitable[None]] | None = None

        try:
            self.cv2 = importlib.import_module("cv2")
        except Exception as exc:
            self.error = f"webcam_cv2_unavailable:{exc}"
            logging.exception("webcam cv2 import failed")

    def webcam_payload(self) -> dict[str, Any]:
        return {
            "type": "webcam",
            "subsystem": "webcam",
            "available": self.available,
            "error": self.error,
            "frameId": self.frame_counter,
            "fps": self.fps,
            "updatedAtMs": self.last_updated_ms,
            "streamPath": WEBCAM_STREAM_PATH,
            "httpPort": THERMAL_HTTP_PORT,
        }

    def state_payload(self) -> dict[str, Any]:
        payload = self.webcam_payload()
        payload.pop("type", None)
        payload.pop("subsystem", None)
        return payload

    def _log_capture_error(self, message: str, exc_info: bool = False) -> None:
        now_monotonic = time.monotonic()
        if now_monotonic - self.last_capture_error_log_monotonic < WEBCAM_CAPTURE_ERROR_LOG_INTERVAL_S:
            return
        self.last_capture_error_log_monotonic = now_monotonic
        if exc_info:
            logging.exception(message)
        else:
            logging.warning(message)

    def _release_capture(self) -> None:
        if self.capture is None:
            return
        try:
            self.capture.release()
        except Exception:
            logging.exception("failed to release webcam capture")
        finally:
            self.capture = None

    def _open_capture(self) -> bool:
        if self.cv2 is None:
            self.available = False
            self.error = self.error or "webcam_cv2_unavailable"
            return False

        if self.capture is not None and self.capture.isOpened():
            return True

        self._release_capture()

        backend = getattr(self.cv2, "CAP_V4L2", None)
        capture = (
            self.cv2.VideoCapture(WEBCAM_DEVICE_INDEX, backend)
            if backend is not None
            else self.cv2.VideoCapture(WEBCAM_DEVICE_INDEX)
        )
        if not capture or not capture.isOpened():
            self.available = False
            self.error = f"webcam_open_failed:/dev/video{WEBCAM_DEVICE_INDEX}"
            return False

        capture.set(self.cv2.CAP_PROP_FRAME_WIDTH, WEBCAM_FRAME_WIDTH)
        capture.set(self.cv2.CAP_PROP_FRAME_HEIGHT, WEBCAM_FRAME_HEIGHT)
        capture.set(self.cv2.CAP_PROP_FPS, 1.0 / WEBCAM_CAPTURE_INTERVAL_S)

        fourcc = getattr(self.cv2, "VideoWriter_fourcc", None)
        if callable(fourcc):
            capture.set(self.cv2.CAP_PROP_FOURCC, fourcc(*"MJPG"))

        self.capture = capture
        self.available = True
        self.error = None
        return True

    def _capture_jpeg(self) -> bytes | None:
        if self.cv2 is None:
            return None
        if not self._open_capture():
            return None
        if self.capture is None:
            return None

        ok, frame = self.capture.read()
        if not ok or frame is None:
            self.available = False
            self.error = "webcam_read_failed"
            self._release_capture()
            return None

        encode_params = [int(self.cv2.IMWRITE_JPEG_QUALITY), WEBCAM_JPEG_QUALITY]
        encoded_ok, encoded = self.cv2.imencode(".jpg", frame, encode_params)
        if not encoded_ok:
            self.available = False
            self.error = "webcam_encode_failed"
            return None

        return encoded.tobytes()

    async def start(self) -> None:
        if self.capture_task and not self.capture_task.done():
            return
        self.capture_task = asyncio.create_task(self._capture_loop())

    async def stop(self) -> None:
        if self.capture_task is not None and not self.capture_task.done():
            self.capture_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.capture_task
        await asyncio.to_thread(self._release_capture)

    async def _capture_loop(self) -> None:
        next_capture_at = 0.0
        while True:
            try:
                now = time.monotonic()
                if now < next_capture_at:
                    await asyncio.sleep(next_capture_at - now)
                    continue
                next_capture_at = now + WEBCAM_CAPTURE_INTERVAL_S

                jpeg = await asyncio.to_thread(self._capture_jpeg)
                if jpeg is None:
                    await asyncio.sleep(WEBCAM_FALLBACK_INTERVAL_S)
                    continue

                now_monotonic = time.monotonic()
                now_ms = int(time.time() * 1000)

                if self.last_frame_monotonic is not None:
                    delta = max(now_monotonic - self.last_frame_monotonic, 1e-3)
                    current_fps = 1.0 / delta
                    if self.fps is None:
                        self.fps = current_fps
                    else:
                        self.fps = (self.fps * 0.8) + (current_fps * 0.2)
                self.last_frame_monotonic = now_monotonic

                async with self.frame_condition:
                    self.frame_counter += 1
                    self.latest_jpeg = jpeg
                    self.last_updated_ms = now_ms
                    self.frame_condition.notify_all()

                if (
                    self.on_webcam_update is not None
                    and now_monotonic - self.last_broadcast_monotonic >= WEBCAM_WS_BROADCAST_INTERVAL_S
                ):
                    self.last_broadcast_monotonic = now_monotonic
                    await self.on_webcam_update()
            except asyncio.CancelledError:
                raise
            except Exception:
                self.available = False
                self.error = "webcam_capture_failure"
                self._log_capture_error("webcam capture failure", exc_info=True)
                await asyncio.sleep(WEBCAM_FALLBACK_INTERVAL_S)

    async def wait_for_frame(
        self,
        last_seen_frame_id: int,
        timeout_s: float = 5.0,
    ) -> tuple[int, bytes, int | None, float | None] | None:
        async with self.frame_condition:
            if self.frame_counter <= last_seen_frame_id:
                try:
                    await asyncio.wait_for(self.frame_condition.wait(), timeout_s)
                except TimeoutError:
                    return None

            if self.latest_jpeg is None:
                return None

            return (
                self.frame_counter,
                self.latest_jpeg,
                self.last_updated_ms,
                self.fps,
            )
