import asyncio
import base64
import importlib
import json
import logging
import math
import os
import re
import time
from typing import Any

import websockets

from .constants import (
    AUTOMATION_CLEANUP_SEQUENCE_DEG,
    AUTOMATION_DISPENSE_BETWEEN_SENDS_S,
    AUTOMATION_DISPENSE_ML_PER_SEND,
    AUTOMATION_DISPENSE_VALVE_OPEN_S,
    AUTOMATION_STIR_MAX_DURATION_S,
    HOST,
    PORT,
    RIG_BASE_ROTATION_CHANNEL,
    RIG_BASE_ROTATION_POSITIONS,
    RIG_DIAGNOSTIC_BASE_TO_VALVE_DELAY_S,
    RIG_DIAGNOSTIC_POST_CLOSE_S,
    RIG_DIAGNOSTIC_SERVO_CHANNELS,
    RIG_DIAGNOSTIC_SERVO_OPEN_S,
    RIG_DIAGNOSTIC_STIRRER_S,
    RIG_OPEN_ANGLE,
    RIG_CLOSED_ANGLE,
    RIG_SERVO_CHANNELS,
    RIG_STIRRER_DURATIONS_S,
    THERMAL_HTTP_HOST,
    THERMAL_HTTP_PORT,
    THERMAL_STREAM_PATH,
    WEBCAM_STREAM_PATH,
    XARM_DEFAULT_MOVE_MS,
    XARM_MAX_MOVE_MS,
    XARM_MIN_MOVE_MS,
    XARM_SERVO_IDS,
)
from .controllers import ThermalController, WebcamController, XArmController, RigController, clamp_int

try:
    aiohttp_web = importlib.import_module("aiohttp.web")
except Exception:
    aiohttp_web = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

xarm_controller = XArmController()
rig_controller = RigController()
thermal_controller = ThermalController()
webcam_controller = WebcamController()
clients: set[Any] = set()
client_send_locks: dict[Any, asyncio.Lock] = {}

rig_base_servo_task: asyncio.Task | None = None
rig_stirrer_task: asyncio.Task | None = None
rig_diagnostic_task: asyncio.Task | None = None
volume_estimation_task: asyncio.Task | None = None
automation_lock = asyncio.Lock()

anthropic_client: Any | None = None
anthropic_model = "claude-haiku-4-5"
latest_volume_ml: float | None = None
latest_volume_raw: str | None = None
latest_volume_error: str | None = None
latest_volume_updated_ms: int | None = None
volume_query_enabled_until_monotonic = 0.0


def parse_xarm_move_ms(raw: Any) -> int:
    if raw is None:
        return XARM_DEFAULT_MOVE_MS
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError("invalid_move_ms")
    return clamp_int(int(raw), XARM_MIN_MOVE_MS, XARM_MAX_MOVE_MS)


def parse_bool(raw: Any, default: bool = False) -> bool:
    if raw is None:
        return default
    if isinstance(raw, bool):
        return raw
    raise ValueError("invalid_wait")


def parse_xarm_targets(raw: Any) -> dict[int, float]:
    parsed: dict[int, float] = {}
    if not isinstance(raw, list):
        raise ValueError("invalid_targets")

    for entry in raw:
        if not isinstance(entry, dict):
            raise ValueError("invalid_targets")
        servo_id = entry.get("id")
        angle = entry.get("angle", entry.get("position"))
        if (
            isinstance(servo_id, bool)
            or not isinstance(servo_id, int)
            or isinstance(angle, bool)
            or not isinstance(angle, (int, float))
        ):
            raise ValueError("invalid_targets")
        if servo_id not in XARM_SERVO_IDS:
            raise ValueError("invalid_id")
        parsed[servo_id] = float(angle)

    if not parsed:
        raise ValueError("empty_targets")

    return parsed


def parse_rig_channel(raw: Any) -> int:
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise ValueError("invalid_channel")
    if raw < 0 or raw >= RIG_SERVO_CHANNELS:
        raise ValueError("invalid_channel")
    return raw


def parse_rig_angle(raw: Any) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError("invalid_angle")
    return float(raw)


def parse_stir_duration(raw: Any) -> int:
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise ValueError("invalid_duration")
    if raw not in RIG_STIRRER_DURATIONS_S:
        raise ValueError("invalid_duration")
    return raw


def parse_base_to_valve_delay(raw: Any) -> float:
    if raw is None:
        return float(RIG_DIAGNOSTIC_BASE_TO_VALVE_DELAY_S)
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError("invalid_base_to_valve_delay")
    parsed = float(raw)
    if parsed < 0:
        raise ValueError("invalid_base_to_valve_delay")
    return parsed


def parse_dropper_number(raw: Any) -> int:
    if isinstance(raw, bool) or not isinstance(raw, int):
        raise ValueError("invalid_dropper")

    max_dropper = min(len(RIG_BASE_ROTATION_POSITIONS), len(RIG_DIAGNOSTIC_SERVO_CHANNELS))
    if raw < 1 or raw > max_dropper:
        raise ValueError("invalid_dropper")
    return raw


def parse_dispense_amount_ml(raw: Any) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError("invalid_amount_ml")
    amount_ml = float(raw)
    if not math.isfinite(amount_ml) or amount_ml <= 0:
        raise ValueError("invalid_amount_ml")
    return amount_ml


def parse_automation_stir_duration_s(raw: Any) -> float:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raise ValueError("invalid_duration_s")
    duration_s = float(raw)
    if (
        not math.isfinite(duration_s)
        or duration_s <= 0
        or duration_s > AUTOMATION_STIR_MAX_DURATION_S
    ):
        raise ValueError("invalid_duration_s")
    return duration_s


def parse_volume_from_text(raw_text: str) -> float | None:
    match = re.search(r"-?\d+(?:\.\d+)?", raw_text)
    if not match:
        return None
    try:
        volume_ml = float(match.group(0))
    except ValueError:
        return None
    if not math.isfinite(volume_ml) or volume_ml < 0:
        return None
    return volume_ml


def volume_payload() -> dict[str, Any]:
    return {
        "type": "volume",
        "subsystem": "volume",
        "model": anthropic_model,
        "volumeMl": latest_volume_ml,
        "raw": latest_volume_raw,
        "error": latest_volume_error,
        "updatedAtMs": latest_volume_updated_ms,
    }


def state_payload() -> dict[str, Any]:
    xarm_state = xarm_controller.state_payload()
    rig_state = rig_controller.state_payload()
    thermal_state = thermal_controller.state_payload()
    webcam_state = webcam_controller.state_payload()
    return {
        "type": "state",
        "xarm": xarm_state,
        "rig": rig_state,
        "thermal": thermal_state,
        "webcam": webcam_state,
        "volume": {
            "model": anthropic_model,
            "volumeMl": latest_volume_ml,
            "raw": latest_volume_raw,
            "error": latest_volume_error,
            "updatedAtMs": latest_volume_updated_ms,
        },
        "servos": xarm_state["servos"],
        "limits": xarm_state["limits"],
        "defaults": xarm_state["defaults"],
        "onlineIds": xarm_state["onlineIds"],
        "angles": rig_state["channels"],
    }


async def send_text(websocket: Any, payload: str) -> bool:
    lock = client_send_locks.get(websocket)
    if lock is None:
        return False
    try:
        async with lock:
            await websocket.send(payload)
        return True
    except Exception:
        return False


async def send_json(websocket: Any, payload: dict[str, Any]) -> bool:
    return await send_text(websocket, json.dumps(payload))


async def send_error(websocket: Any, reason: str) -> None:
    await send_json(websocket, {"type": "error", "error": reason})


async def broadcast_payload(payload: dict[str, Any]) -> None:
    if not clients:
        return

    serialized_payload = json.dumps(payload)
    stale_clients: list[Any] = []
    for websocket in tuple(clients):
        if not await send_text(websocket, serialized_payload):
            stale_clients.append(websocket)

    for websocket in stale_clients:
        clients.discard(websocket)
        client_send_locks.pop(websocket, None)


async def broadcast_state() -> None:
    await broadcast_payload(state_payload())


async def broadcast_thermal() -> None:
    await broadcast_payload(thermal_controller.thermal_payload())


async def broadcast_webcam() -> None:
    await broadcast_payload(webcam_controller.webcam_payload())


async def broadcast_volume() -> None:
    await broadcast_payload(volume_payload())


def enable_volume_queries_for_seconds(duration_s: float) -> None:
    global volume_query_enabled_until_monotonic
    volume_query_enabled_until_monotonic = max(
        volume_query_enabled_until_monotonic,
        time.monotonic() + max(0.0, duration_s),
    )


def initialize_anthropic_client() -> None:
    global anthropic_client
    global latest_volume_error

    try:
        dotenv_module = importlib.import_module("dotenv")
        load_dotenv = getattr(dotenv_module, "load_dotenv", None)
        if callable(load_dotenv):
            load_dotenv()
    except Exception:
        pass

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        latest_volume_error = "anthropic_api_key_missing"
        logging.warning("volume estimation disabled: ANTHROPIC_API_KEY missing")
        return

    try:
        anthropic_module = importlib.import_module("anthropic")
        anthropic_client = anthropic_module.Anthropic(api_key=api_key)
        latest_volume_error = None
    except Exception as exc:
        latest_volume_error = f"anthropic_init_failed:{exc}"
        logging.exception("failed to initialize anthropic client")


def request_volume_estimate_sync(jpeg: bytes) -> tuple[float | None, str | None]:
    if anthropic_client is None:
        return None, "anthropic_unavailable"

    image_base64 = base64.b64encode(jpeg).decode("ascii")
    response = anthropic_client.messages.create(
        model=anthropic_model,
        max_tokens=10,
        temperature=0,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Give me the volume of liquid and/or foam in the flask in "
                            "milliliters as just the number. Use the graduation lines for "
                            "reference. The height of substance may be higher than the highest "
                            "marking. Infer the volume if between markings. The angle of the "
                            "image may be skewed."
                        ),
                    },
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64,
                        },
                    },
                ],
            }
        ],
    )

    raw_text = ""
    content = getattr(response, "content", None)
    if isinstance(content, list) and content:
        first_entry = content[0]
        raw_text = str(getattr(first_entry, "text", "")).strip()
    volume_ml = parse_volume_from_text(raw_text)
    return volume_ml, raw_text


async def run_volume_estimation_loop() -> None:
    global latest_volume_ml
    global latest_volume_raw
    global latest_volume_error
    global latest_volume_updated_ms

    while True:
        try:
            await asyncio.sleep(2.0)

            if anthropic_client is None:
                continue

            if time.monotonic() > volume_query_enabled_until_monotonic:
                continue

            frame = webcam_controller.latest_jpeg
            if frame is None:
                continue

            volume_ml, raw_text = await asyncio.to_thread(request_volume_estimate_sync, frame)
            latest_volume_updated_ms = int(time.time() * 1000)
            latest_volume_raw = raw_text

            if volume_ml is None:
                latest_volume_ml = None
                latest_volume_error = "volume_parse_failed"
            else:
                latest_volume_ml = round(volume_ml, 2)
                latest_volume_error = None

            await broadcast_volume()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            latest_volume_ml = None
            latest_volume_updated_ms = int(time.time() * 1000)
            latest_volume_error = f"volume_estimation_failed:{exc}"
            logging.exception("volume estimation loop failed")
            await broadcast_volume()


async def run_rig_base_move(target: float) -> None:
    thermal_controller.set_paused("rig_base_move", True)
    try:
        await rig_controller.move_base_servo(target)
    finally:
        thermal_controller.set_paused("rig_base_move", False)


async def run_rig_stirrer(duration: float) -> None:
    rig_controller.stirrer_active = True
    await broadcast_state()
    try:
        await rig_controller.run_stirrer(duration)
    finally:
        rig_controller.stirrer_active = False
        await broadcast_state()


async def sleep_non_negative(seconds: float) -> None:
    if seconds <= 0:
        return
    await asyncio.sleep(seconds)


async def run_rig_diagnostic(websocket: Any, base_to_valve_delay_s: float) -> None:
    global rig_base_servo_task

    rig_controller._ensure_available()

    try:
        rig_controller.close_non_base_servos()
        rig_controller.force_stirrer_off()
        await rig_controller.move_base_servo(RIG_BASE_ROTATION_POSITIONS[0])
        await sleep_non_negative(base_to_valve_delay_s)
        await broadcast_state()
        await send_json(
            websocket,
            {
                "type": "diagnostic",
                "subsystem": "rig",
                "status": "initialized",
                "baseToValveDelayS": base_to_valve_delay_s,
            },
        )

        for index, base_position in enumerate(RIG_BASE_ROTATION_POSITIONS):
            move_task = None

            if index > 0:
                move_task = asyncio.create_task(rig_controller.move_base_servo(base_position))
                rig_base_servo_task = move_task

            if move_task is not None:
                await move_task
                await broadcast_state()
                await sleep_non_negative(base_to_valve_delay_s)

            channel = RIG_DIAGNOSTIC_SERVO_CHANNELS[index]
            rig_controller.set_channel_immediate(channel, RIG_OPEN_ANGLE)
            await broadcast_state()

            await sleep_non_negative(RIG_DIAGNOSTIC_SERVO_OPEN_S)
            rig_controller.set_channel_immediate(channel, RIG_CLOSED_ANGLE)
            await broadcast_state()

            if index < len(RIG_BASE_ROTATION_POSITIONS) - 1:
                await sleep_non_negative(RIG_DIAGNOSTIC_POST_CLOSE_S)

        rig_controller.stirrer_active = True
        await broadcast_state()
        await rig_controller.run_stirrer(RIG_DIAGNOSTIC_STIRRER_S)
        await broadcast_state()
        await send_json(
            websocket,
            {"type": "diagnostic", "subsystem": "rig", "status": "completed"},
        )
    except asyncio.CancelledError:
        rig_controller.force_stirrer_off()
        rig_controller.close_non_base_servos()
        await broadcast_state()
        raise
    finally:
        if rig_base_servo_task and rig_base_servo_task.done():
            rig_base_servo_task = None


async def run_dispense(dropper: int, amount_ml: float) -> dict[str, Any]:
    rig_controller._ensure_available()

    dropper_index = dropper - 1
    target_base = float(RIG_BASE_ROTATION_POSITIONS[dropper_index])
    valve_channel = int(RIG_DIAGNOSTIC_SERVO_CHANNELS[dropper_index])
    sends = max(1, math.ceil(amount_ml / AUTOMATION_DISPENSE_ML_PER_SEND))
    dispensed_amount_ml = sends * AUTOMATION_DISPENSE_ML_PER_SEND

    rig_controller.close_non_base_servos()
    await broadcast_state()

    current_base = float(rig_controller.servo_angles[RIG_BASE_ROTATION_CHANNEL])
    if round(current_base) != round(target_base):
        await run_rig_base_move(target_base)
        await broadcast_state()
        await sleep_non_negative(RIG_DIAGNOSTIC_BASE_TO_VALVE_DELAY_S)

    for send_index in range(sends):
        rig_controller.set_channel_immediate(valve_channel, RIG_OPEN_ANGLE)
        await broadcast_state()
        await sleep_non_negative(AUTOMATION_DISPENSE_VALVE_OPEN_S)

        rig_controller.set_channel_immediate(valve_channel, RIG_CLOSED_ANGLE)
        if dropper == 3:
            enable_volume_queries_for_seconds(10.0)
        await broadcast_state()

        if send_index < sends - 1:
            await sleep_non_negative(AUTOMATION_DISPENSE_BETWEEN_SENDS_S)

    return {
        "dropper": dropper,
        "sends": sends,
        "requestedAmountMl": round(amount_ml, 3),
        "dispensedAmountMl": round(dispensed_amount_ml, 3),
    }


async def run_cleanup(move_ms: int) -> int:
    xarm_controller._ensure_available()

    step_delay_s = move_ms / 1000.0
    expected_servo_count = len(XARM_SERVO_IDS)

    for step in AUTOMATION_CLEANUP_SEQUENCE_DEG:
        if len(step) != expected_servo_count:
            raise RuntimeError("cleanup_step_invalid")

        targets = {
            servo_id: float(step[servo_index])
            for servo_index, servo_id in enumerate(XARM_SERVO_IDS)
        }
        await xarm_controller.set_many(targets, move_ms)
        await broadcast_state()
        await sleep_non_negative(step_delay_s)

    return len(AUTOMATION_CLEANUP_SEQUENCE_DEG)


async def handle_xarm_scan(websocket: Any) -> None:
    try:
        await xarm_controller.scan()
    except Exception as exc:
        await send_error(websocket, str(exc))
        return

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "xarm",
            "action": "scan",
            "onlineIds": sorted(xarm_controller.online_ids),
        },
    )
    await broadcast_state()


async def handle_xarm_set(websocket: Any, data: dict[str, Any]) -> None:
    servo_id = data.get("id")
    angle = data.get("angle", data.get("position"))

    try:
        if (
            isinstance(servo_id, bool)
            or not isinstance(servo_id, int)
            or isinstance(angle, bool)
            or not isinstance(angle, (int, float))
        ):
            raise ValueError("invalid_payload")

        move_ms = parse_xarm_move_ms(data.get("moveMs"))
        wait = parse_bool(data.get("wait"), default=False)
        target_angle_deg, duration = await xarm_controller.set_position(
            servo_id,
            float(angle),
            move_ms,
            wait=wait,
        )
    except ValueError as exc:
        await send_error(websocket, str(exc))
        return
    except Exception as exc:
        logging.exception("xarm set failed id=%s", servo_id)
        await send_error(websocket, f"set_failed:{exc}")
        return

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "xarm",
            "action": "set",
            "id": servo_id,
            "angle": target_angle_deg,
            # Keep legacy key with degree units for older clients.
            "position": target_angle_deg,
            "moveMs": duration,
        },
    )
    await broadcast_state()


async def handle_xarm_set_many(websocket: Any, data: dict[str, Any]) -> None:
    try:
        targets = parse_xarm_targets(data.get("targets"))
        move_ms = parse_xarm_move_ms(data.get("moveMs"))
        duration = await xarm_controller.set_many(targets, move_ms)
    except ValueError as exc:
        await send_error(websocket, str(exc))
        return
    except Exception as exc:
        logging.exception("xarm set_many failed")
        await send_error(websocket, f"set_many_failed:{exc}")
        return

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "xarm",
            "action": "set_many",
            "count": len(targets),
            "moveMs": duration,
        },
    )
    await broadcast_state()


async def handle_xarm_recenter(websocket: Any, data: dict[str, Any]) -> None:
    try:
        move_ms = parse_xarm_move_ms(data.get("moveMs"))
        duration = await xarm_controller.recenter(move_ms)
    except ValueError as exc:
        await send_error(websocket, str(exc))
        return
    except Exception as exc:
        logging.exception("xarm recenter failed")
        await send_error(websocket, f"recenter_failed:{exc}")
        return

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "xarm",
            "action": "recenter",
            "moveMs": duration,
        },
    )
    await broadcast_state()


async def handle_rig_set(websocket: Any, data: dict[str, Any]) -> None:
    global rig_base_servo_task
    global rig_diagnostic_task

    try:
        rig_controller._ensure_available()
        channel = parse_rig_channel(data.get("channel"))
        angle = parse_rig_angle(data.get("angle"))
        target = rig_controller.clamp_angle_for_channel(channel, angle)
    except ValueError as exc:
        await send_error(websocket, str(exc))
        return
    except Exception as exc:
        await send_error(websocket, str(exc))
        return

    if rig_diagnostic_task and not rig_diagnostic_task.done():
        rig_diagnostic_task.cancel()
    rig_diagnostic_task = None

    try:
        if channel == RIG_BASE_ROTATION_CHANNEL:
            if rig_base_servo_task and not rig_base_servo_task.done():
                rig_base_servo_task.cancel()
            rig_base_servo_task = asyncio.create_task(run_rig_base_move(target))
        else:
            rig_controller.set_channel_immediate(channel, target)
    except Exception as exc:
        logging.exception("rig set failed channel=%s", channel)
        await send_error(websocket, f"rig_set_failed:{exc}")
        return

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "rig",
            "action": "set",
            "channel": channel,
            "angle": target,
        },
    )


async def handle_rig_stir(websocket: Any, data: dict[str, Any]) -> None:
    global rig_stirrer_task
    global rig_diagnostic_task

    try:
        rig_controller._ensure_available()
        duration = parse_stir_duration(data.get("duration"))
    except ValueError as exc:
        await send_error(websocket, str(exc))
        return
    except Exception as exc:
        await send_error(websocket, str(exc))
        return

    if rig_diagnostic_task and not rig_diagnostic_task.done():
        rig_diagnostic_task.cancel()
    rig_diagnostic_task = None

    if rig_stirrer_task and not rig_stirrer_task.done():
        rig_stirrer_task.cancel()
    rig_stirrer_task = asyncio.create_task(run_rig_stirrer(duration))

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "rig",
            "action": "stir",
            "duration": duration,
        },
    )


async def handle_rig_diagnostic(websocket: Any, data: dict[str, Any]) -> None:
    global rig_base_servo_task
    global rig_stirrer_task
    global rig_diagnostic_task

    try:
        rig_controller._ensure_available()
        base_to_valve_delay_s = parse_base_to_valve_delay(data.get("baseToValveDelayS"))
    except ValueError as exc:
        await send_error(websocket, str(exc))
        return
    except Exception as exc:
        await send_error(websocket, str(exc))
        return

    if rig_base_servo_task and not rig_base_servo_task.done():
        rig_base_servo_task.cancel()
    rig_base_servo_task = None

    if rig_stirrer_task and not rig_stirrer_task.done():
        rig_stirrer_task.cancel()
    rig_stirrer_task = None

    if rig_diagnostic_task and not rig_diagnostic_task.done():
        rig_diagnostic_task.cancel()
    rig_diagnostic_task = asyncio.create_task(run_rig_diagnostic(websocket, base_to_valve_delay_s))

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "rig",
            "action": "diagnostic",
            "baseToValveDelayS": base_to_valve_delay_s,
        },
    )


async def handle_automation_dispense(websocket: Any, data: dict[str, Any]) -> None:
    global rig_base_servo_task
    global rig_diagnostic_task

    if automation_lock.locked():
        await send_error(websocket, "automation_busy")
        return

    try:
        rig_controller._ensure_available()
        dropper = parse_dropper_number(data.get("dropper"))
        amount_ml = parse_dispense_amount_ml(data.get("amountMl", data.get("amount")))
    except ValueError as exc:
        await send_error(websocket, str(exc))
        return
    except Exception as exc:
        await send_error(websocket, str(exc))
        return

    if rig_diagnostic_task and not rig_diagnostic_task.done():
        rig_diagnostic_task.cancel()
    rig_diagnostic_task = None

    if rig_base_servo_task and not rig_base_servo_task.done():
        rig_base_servo_task.cancel()
    rig_base_servo_task = None

    try:
        async with automation_lock:
            result = await run_dispense(dropper, amount_ml)
    except Exception as exc:
        logging.exception("automation dispense failed dropper=%s amount_ml=%s", dropper, amount_ml)
        await send_error(websocket, f"dispense_failed:{exc}")
        return

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "automation",
            "action": "dispense",
            **result,
        },
    )


async def handle_automation_stir(websocket: Any, data: dict[str, Any]) -> None:
    global rig_stirrer_task
    global rig_diagnostic_task

    try:
        rig_controller._ensure_available()
        duration_s = parse_automation_stir_duration_s(data.get("durationS", data.get("duration")))
    except ValueError as exc:
        await send_error(websocket, str(exc))
        return
    except Exception as exc:
        await send_error(websocket, str(exc))
        return

    if rig_diagnostic_task and not rig_diagnostic_task.done():
        rig_diagnostic_task.cancel()
    rig_diagnostic_task = None

    if rig_stirrer_task and not rig_stirrer_task.done():
        rig_stirrer_task.cancel()
    rig_stirrer_task = None

    try:
        await run_rig_stirrer(duration_s)
    except Exception as exc:
        logging.exception("automation stir failed duration_s=%s", duration_s)
        await send_error(websocket, f"stir_failed:{exc}")
        return

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "automation",
            "action": "stir",
            "durationS": round(duration_s, 3),
        },
    )


async def handle_automation_cleanup(websocket: Any, data: dict[str, Any]) -> None:
    if automation_lock.locked():
        await send_error(websocket, "automation_busy")
        return

    try:
        move_ms = parse_xarm_move_ms(data.get("moveMs"))
    except ValueError as exc:
        await send_error(websocket, str(exc))
        return

    try:
        async with automation_lock:
            steps = await run_cleanup(move_ms)
    except Exception as exc:
        logging.exception("automation cleanup failed move_ms=%s", move_ms)
        await send_error(websocket, f"cleanup_failed:{exc}")
        return

    await send_json(
        websocket,
        {
            "type": "ack",
            "subsystem": "automation",
            "action": "cleanup",
            "steps": steps,
            "moveMs": move_ms,
        },
    )


async def handle_thermal_mjpeg(request: Any) -> Any:
    if aiohttp_web is None:
        return None

    if not thermal_controller.available:
        return aiohttp_web.Response(
            status=503,
            text=f"thermal_unavailable:{thermal_controller.error}",
        )

    response = aiohttp_web.StreamResponse(
        status=200,
        headers={
            "Content-Type": "multipart/x-mixed-replace; boundary=frame",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Connection": "close",
            "Access-Control-Allow-Origin": "*",
        },
    )
    await response.prepare(request)

    last_seen_frame_id = 0
    try:
        while True:
            snapshot = await thermal_controller.wait_for_frame(last_seen_frame_id, timeout_s=5.0)
            if snapshot is None:
                await response.write(
                    b"--frame\r\n"
                    b"Content-Type: text/plain\r\n"
                    b"\r\n"
                    b"waiting_for_thermal_frame\r\n"
                )
                continue

            frame_id, jpeg, min_temp, max_temp, updated_ms, _fps = snapshot
            part_headers = (
                "--frame\r\n"
                "Content-Type: image/jpeg\r\n"
                f"Content-Length: {len(jpeg)}\r\n"
                f"X-Max-Temp-C: {max_temp:.2f}\r\n"
                f"X-Min-Temp-C: {min_temp:.2f}\r\n"
                f"X-Frame-Id: {frame_id}\r\n"
                f"X-Updated-At-Ms: {updated_ms if updated_ms is not None else 0}\r\n"
                "\r\n"
            ).encode("ascii")
            await response.write(part_headers)
            await response.write(jpeg)
            await response.write(b"\r\n")
            last_seen_frame_id = frame_id
    except (asyncio.CancelledError, ConnectionResetError, BrokenPipeError):
        pass
    return response


async def handle_thermal_json(_request: Any) -> Any:
    if aiohttp_web is None:
        return None
    payload = thermal_controller.state_payload()
    return aiohttp_web.json_response(payload)


async def handle_webcam_mjpeg(request: Any) -> Any:
    if aiohttp_web is None:
        return None

    if not webcam_controller.available and webcam_controller.latest_jpeg is None:
        return aiohttp_web.Response(
            status=503,
            text=f"webcam_unavailable:{webcam_controller.error}",
        )

    response = aiohttp_web.StreamResponse(
        status=200,
        headers={
            "Content-Type": "multipart/x-mixed-replace; boundary=frame",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Connection": "close",
            "Access-Control-Allow-Origin": "*",
        },
    )
    await response.prepare(request)

    last_seen_frame_id = 0
    try:
        while True:
            snapshot = await webcam_controller.wait_for_frame(last_seen_frame_id, timeout_s=5.0)
            if snapshot is None:
                await response.write(
                    b"--frame\r\n"
                    b"Content-Type: text/plain\r\n"
                    b"\r\n"
                    b"waiting_for_webcam_frame\r\n"
                )
                continue

            frame_id, jpeg, updated_ms, fps = snapshot
            fps_value = fps if fps is not None else 0.0
            part_headers = (
                "--frame\r\n"
                "Content-Type: image/jpeg\r\n"
                f"Content-Length: {len(jpeg)}\r\n"
                f"X-Frame-Id: {frame_id}\r\n"
                f"X-Updated-At-Ms: {updated_ms if updated_ms is not None else 0}\r\n"
                f"X-FPS: {fps_value:.2f}\r\n"
                "\r\n"
            ).encode("ascii")
            await response.write(part_headers)
            await response.write(jpeg)
            await response.write(b"\r\n")
            last_seen_frame_id = frame_id
    except (asyncio.CancelledError, ConnectionResetError, BrokenPipeError):
        pass
    return response


async def handle_webcam_json(_request: Any) -> Any:
    if aiohttp_web is None:
        return None
    payload = webcam_controller.state_payload()
    return aiohttp_web.json_response(payload)


async def start_thermal_http_server() -> Any | None:
    if aiohttp_web is None:
        logging.warning("aiohttp is not installed; thermal stream endpoint disabled")
        return None

    app = aiohttp_web.Application()
    app.router.add_get(THERMAL_STREAM_PATH, handle_thermal_mjpeg)
    app.router.add_get("/thermal.json", handle_thermal_json)
    app.router.add_get(WEBCAM_STREAM_PATH, handle_webcam_mjpeg)
    app.router.add_get("/webcam.json", handle_webcam_json)

    runner = aiohttp_web.AppRunner(app)
    await runner.setup()
    site = aiohttp_web.TCPSite(runner, THERMAL_HTTP_HOST, THERMAL_HTTP_PORT)
    await site.start()
    logging.info(
        "media http server listening on %s:%s (%s, %s)",
        THERMAL_HTTP_HOST,
        THERMAL_HTTP_PORT,
        THERMAL_STREAM_PATH,
        WEBCAM_STREAM_PATH,
    )
    return runner


async def handle_message(websocket: Any, message: str) -> None:
    logging.info("recv %s", message)

    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        await send_error(websocket, "invalid_json")
        return

    if not isinstance(data, dict):
        await send_error(websocket, "invalid_payload")
        return

    command_type = data.get("type")

    if command_type == "get_state":
        await send_json(websocket, state_payload())
        return

    if command_type in {"scan", "xarm_scan"}:
        await handle_xarm_scan(websocket)
        return

    if command_type in {"set_many", "xarm_set_many"}:
        await handle_xarm_set_many(websocket, data)
        return

    if command_type in {"recenter", "xarm_recenter"}:
        await handle_xarm_recenter(websocket, data)
        return

    if command_type in {"set", "xarm_set"} and (
        command_type == "xarm_set" or "id" in data
    ):
        await handle_xarm_set(websocket, data)
        return

    if command_type in {"set", "rig_set"} and (
        command_type == "rig_set" or "channel" in data
    ):
        await handle_rig_set(websocket, data)
        return

    if command_type in {"dispense", "automation_dispense"}:
        await handle_automation_dispense(websocket, data)
        return

    if command_type in {"cleanup", "automation_cleanup"}:
        await handle_automation_cleanup(websocket, data)
        return

    if command_type in {"stir", "automation_stir"} and (
        command_type == "automation_stir" or "durationS" in data
    ):
        await handle_automation_stir(websocket, data)
        return

    if command_type in {"stir", "rig_stir"}:
        await handle_rig_stir(websocket, data)
        return

    if command_type in {"diagnostic", "rig_diagnostic"}:
        await handle_rig_diagnostic(websocket, data)
        return

    await send_error(websocket, "unknown_command")


async def handler(websocket: Any) -> None:
    clients.add(websocket)
    client_send_locks[websocket] = asyncio.Lock()
    logging.info("client connected")
    await send_json(websocket, {"type": "info", "message": "connected"})
    await send_json(websocket, state_payload())

    try:
        async for message in websocket:
            await handle_message(websocket, message)
    except websockets.ConnectionClosed:
        logging.info("client disconnected")
    finally:
        clients.discard(websocket)
        client_send_locks.pop(websocket, None)


async def main() -> None:
    global volume_estimation_task

    logging.info("initializing controllers...")
    initialize_anthropic_client()

    thermal_controller.on_thermal_update = broadcast_thermal
    webcam_controller.on_webcam_update = broadcast_webcam
    await xarm_controller.capture_startup_centers()
    await thermal_controller.start()
    await webcam_controller.start()
    if anthropic_client is not None:
        volume_estimation_task = asyncio.create_task(run_volume_estimation_loop())
    thermal_http_runner = await start_thermal_http_server()
    logging.info(
        "xarm available=%s online_ids=%s error=%s",
        xarm_controller.available,
        sorted(xarm_controller.online_ids),
        xarm_controller.error,
    )
    logging.info(
        "rig available=%s error=%s",
        rig_controller.available,
        rig_controller.error,
    )
    logging.info(
        "thermal available=%s error=%s stream=http://%s:%s%s",
        thermal_controller.available,
        thermal_controller.error,
        THERMAL_HTTP_HOST,
        THERMAL_HTTP_PORT,
        THERMAL_STREAM_PATH,
    )
    logging.info(
        "webcam available=%s error=%s stream=http://%s:%s%s",
        webcam_controller.available,
        webcam_controller.error,
        THERMAL_HTTP_HOST,
        THERMAL_HTTP_PORT,
        WEBCAM_STREAM_PATH,
    )

    try:
        async with websockets.serve(handler, HOST, PORT):
            logging.info("websocket server listening on %s:%s", HOST, PORT)
            await asyncio.Future()
    finally:
        if volume_estimation_task is not None and not volume_estimation_task.done():
            volume_estimation_task.cancel()
            try:
                await volume_estimation_task
            except asyncio.CancelledError:
                pass
            volume_estimation_task = None
        await thermal_controller.stop()
        await webcam_controller.stop()
        if thermal_http_runner is not None:
            await thermal_http_runner.cleanup()
