import { tool } from "ai";
import { z } from "zod";

/* ── Context shape sent from the client ─────────────────────────────────── */

export interface TelemetrySummary {
  samples: number;
  elapsedS: number;
  temperature: {
    current: number | null;
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  volume: {
    total: number;
    h2o2: number;
    soap: number;
    catalyst: number;
  };
}

export interface ExperimentContext {
  id: string;
  title: string;
  status: string;
  reasoning?: string;
  goals?: string[];
  iterations: { number: number; summary: string; createdAt: string }[];
  procedure: { type: string; [key: string]: unknown }[];
  telemetry: TelemetrySummary;
}

/* ── Tool factories (created per-request with the experiment context) ──── */

export function createExperimentTools(ctx: ExperimentContext | null) {
  return {
    getExperimentData: tool({
      description:
        "Retrieve the current experiment's data: metadata, procedure steps, " +
        "iteration history, and live telemetry readings (temperature, dispensed volumes). " +
        "Use this to answer questions about the experiment.",
      inputSchema: z.object({
        section: z
          .enum(["all", "procedure", "iterations", "telemetry"])
          .optional()
          .describe("Which section of the data to retrieve. Defaults to all."),
      }),
      execute: async ({ section = "all" }) => {
        if (!ctx) return { error: "No experiment data available." };

        if (section === "procedure") {
          return { id: ctx.id, title: ctx.title, procedure: ctx.procedure };
        }
        if (section === "iterations") {
          return { id: ctx.id, title: ctx.title, iterations: ctx.iterations };
        }
        if (section === "telemetry") {
          return { id: ctx.id, title: ctx.title, telemetry: ctx.telemetry };
        }
        return ctx;
      },
    }),

    generateLatexSummary: tool({
      description:
        "Generate a LaTeX results section summarizing the experiment for a research paper. " +
        "Includes a telemetry data table, procedure summary, and iteration history. " +
        "Use this when the user asks for a paper summary, LaTeX output, or results writeup.",
      inputSchema: z.object({
        title: z
          .string()
          .optional()
          .describe("Custom title for the results section. Defaults to the experiment title."),
        abstract: z
          .string()
          .optional()
          .describe(
            "A brief abstract or description of the experiment to include. " +
              "Generate this yourself based on the experiment data.",
          ),
      }),
      execute: async ({ title, abstract }) => {
        if (!ctx) return { error: "No experiment data available." };

        const sectionTitle = title ?? ctx.title;
        const tel = ctx.telemetry;

        const reagentLabel: Record<string, string> = {
          A: "H₂O₂",
          B: "surfactant",
          C: "catalyst",
        };

        // ── Rendered markdown ──────────────────────────────────────────

        const mdProcedure = ctx.procedure
          .map((step, i) => {
            switch (step.type) {
              case "dispense":
                return `${i + 1}. Dispense **${step.amount ?? "?"} ${step.unit ?? "mL"}** of ${reagentLabel[step.reagent as string] ?? step.reagent ?? "reagent"}`;
              case "stir":
                return `${i + 1}. Stir for **${step.duration ?? "?"} ${step.unit ?? "s"}**`;
              case "cleanup":
                return `${i + 1}. Clean up apparatus`;
              default:
                return `${i + 1}. ${step.type}`;
            }
          })
          .join("\n");

        const mdGoals =
          ctx.goals && ctx.goals.length > 0
            ? `### Objectives\n\n${ctx.goals.map((g) => `- ${g}`).join("\n")}\n`
            : "";

        const fmtVol = (v: number) => `${v.toFixed(1)} mL`;

        const mdIterRows = ctx.iterations
          .map((it) => `| ${it.number} | ${it.summary} | ${it.createdAt} |`)
          .join("\n");

        const rendered = `## Results: ${sectionTitle}

${abstract ? `*${abstract}*\n` : ""}${ctx.reasoning ? `### Rationale\n\n${ctx.reasoning}\n` : ""}${mdGoals}
### Experimental Procedure

The experiment consisted of **${ctx.procedure.length}** steps executed over **${ctx.iterations.length}** iteration(s).

${mdProcedure}

### Telemetry Summary

Telemetry data was recorded at 2 s intervals over a period of ${tel.elapsedS.toFixed(1)} s (${tel.samples} samples).

$$
T_{\\text{current}} = ${tel.temperature.current?.toFixed(1) ?? "\\text{N/A}"} \\;{}^\\circ\\text{C} \\qquad T_{\\min} = ${tel.temperature.min?.toFixed(1) ?? "\\text{N/A}"} \\;{}^\\circ\\text{C} \\qquad T_{\\max} = ${tel.temperature.max?.toFixed(1) ?? "\\text{N/A}"} \\;{}^\\circ\\text{C} \\qquad \\bar{T} = ${tel.temperature.avg?.toFixed(1) ?? "\\text{N/A}"} \\;{}^\\circ\\text{C}
$$

| Reagent | Volume |
|---|---|
| H₂O₂ | ${fmtVol(tel.volume.h2o2)} |
| Surfactant | ${fmtVol(tel.volume.soap)} |
| Catalyst | ${fmtVol(tel.volume.catalyst)} |
| **Total** | **${fmtVol(tel.volume.total)}** |

### Iteration History

| # | Summary | Date |
|---|---|---|
${mdIterRows}`;

        // ── Raw LaTeX source ───────────────────────────────────────────

        const latexProcedure = ctx.procedure
          .map((step) => {
            switch (step.type) {
              case "dispense":
                return `  \\item Dispense ${step.amount ?? "?"} ${step.unit ?? ""} of ${step.reagent ?? "reagent"}`;
              case "stir":
                return `  \\item Stir for ${step.duration ?? "?"} ${step.unit ?? "s"}`;
              case "cleanup":
                return `  \\item Clean up apparatus`;
              default:
                return `  \\item ${step.type}`;
            }
          })
          .join("\n");

        const latexIterRows = ctx.iterations
          .map((it) => `    ${it.number} & ${it.summary} & ${it.createdAt} \\\\`)
          .join("\n");

        const latexGoals =
          ctx.goals && ctx.goals.length > 0
            ? `\\subsection{Objectives}\n\n\\begin{itemize}\n${ctx.goals.map((g) => `  \\item ${g}`).join("\n")}\n\\end{itemize}\n`
            : "";

        const latex = `\\section{Results: ${sectionTitle}}

${abstract ? `\\subsection*{Abstract}\n${abstract}\n` : ""}${ctx.reasoning ? `\\subsection{Rationale}\n\n${ctx.reasoning}\n` : ""}${latexGoals}
\\subsection{Experimental Procedure}

The experiment consisted of ${ctx.procedure.length} steps executed over ${ctx.iterations.length} iteration(s).

\\begin{enumerate}
${latexProcedure}
\\end{enumerate}

\\subsection{Telemetry Summary}

Telemetry data was recorded at 2-second intervals over a period of ${tel.elapsedS.toFixed(1)} seconds (${tel.samples} samples).

\\begin{table}[h]
\\centering
\\caption{Telemetry readings for ${sectionTitle}}
\\begin{tabular}{lcc}
\\hline
\\textbf{Metric} & \\textbf{Value} & \\textbf{Unit} \\\\
\\hline
Temperature (current) & ${tel.temperature.current?.toFixed(1) ?? "N/A"} & °C \\\\
Temperature (min) & ${tel.temperature.min?.toFixed(1) ?? "N/A"} & °C \\\\
Temperature (max) & ${tel.temperature.max?.toFixed(1) ?? "N/A"} & °C \\\\
Temperature (mean) & ${tel.temperature.avg?.toFixed(1) ?? "N/A"} & °C \\\\
\\hline
H\\textsubscript{2}O\\textsubscript{2} dispensed & ${tel.volume.h2o2.toFixed(1)} & mL \\\\
Surfactant dispensed & ${tel.volume.soap.toFixed(1)} & mL \\\\
Catalyst dispensed & ${tel.volume.catalyst.toFixed(1)} & mL \\\\
Total volume & ${tel.volume.total.toFixed(1)} & mL \\\\
\\hline
\\end{tabular}
\\end{table}

\\subsection{Iteration History}

\\begin{table}[h]
\\centering
\\caption{Iteration log for ${sectionTitle}}
\\begin{tabular}{clc}
\\hline
\\textbf{\\#} & \\textbf{Summary} & \\textbf{Date} \\\\
\\hline
${latexIterRows}
\\hline
\\end{tabular}
\\end{table}`;

        return { rendered, latex };
      },
    }),
  };
}
