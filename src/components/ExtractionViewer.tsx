import type { JobExtractedResponse } from "../types/api";
import ConfidenceBadge from "./ConfidenceBadge";

interface Props {
  data: JobExtractedResponse;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass p-5 mb-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  const display = typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <div className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
      <dt className="w-36 shrink-0 text-xs text-slate-500 pt-0.5">{label}</dt>
      <dd className="text-sm text-slate-200 flex-1 break-words">{display}</dd>
    </div>
  );
}

function ListTable({ items, columns }: { items: Record<string, unknown>[]; columns: string[] }) {
  if (!items?.length) return <p className="text-slate-500 text-sm">None found</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-white/5">
            {columns.map(c => (
              <th key={c} className="px-3 py-2 text-left text-slate-400 font-medium capitalize">
                {c.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i} className="border-t border-white/5 hover:bg-white/5">
              {columns.map(c => (
                <td key={c} className="px-3 py-2 text-slate-300">
                  {row[c] !== null && row[c] !== undefined ? (
                    c === "is_abnormal"
                      ? (row[c] ? <span className="text-red-400">↑ Abnormal</span> : <span className="text-emerald-400">Normal</span>)
                      : String(row[c])
                  ) : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExtractionViewer({ data }: Props) {
  const ext = data.extracted_data as Record<string, unknown> | null;
  const conf = data.confidence;
  if (!ext) return <p className="text-slate-500">No extracted data available.</p>;

  const docType = data.document_type;
  const patient = ext.patient as Record<string, unknown> ?? {};
  const encounter = ext.encounter as Record<string, unknown> ?? {};
  const vitals = ext.vitals as Record<string, unknown> ?? {};

  return (
    <div>
      {/* Confidence overview */}
      {conf && Object.keys(conf).length > 0 && (
        <Section title="Extraction Confidence">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(conf).map(([field, detail]) => (
              <ConfidenceBadge key={field} field={field} detail={detail} />
            ))}
          </div>
        </Section>
      )}

      {/* Patient */}
      <Section title="Patient Information">
        <dl>
          <Field label="Name" value={patient.name} />
          <Field label="Age" value={patient.age} />
          <Field label="Gender" value={patient.gender} />
          <Field label="Patient ID" value={patient.id} />
          <Field label="Address" value={patient.address} />
        </dl>
      </Section>

      {/* Encounter (discharge summary) */}
      {docType === "discharge_summary" && (
        <Section title="Encounter">
          <dl>
            <Field label="Hospital" value={encounter.hospital_name} />
            <Field label="Department" value={encounter.department} />
            <Field label="Ward" value={encounter.ward} />
            <Field label="Admission" value={encounter.admission_date} />
            <Field label="Discharge" value={encounter.discharge_date} />
            <Field label="Doctor" value={ext.treating_doctor} />
          </dl>
        </Section>
      )}

      {/* Diagnoses */}
      {docType === "discharge_summary" && (
        <Section title="Diagnoses">
          <ListTable
            items={(ext.diagnoses as Record<string, unknown>[]) ?? []}
            columns={["text", "type", "icd_code"]}
          />
        </Section>
      )}

      {/* Vitals */}
      {docType === "discharge_summary" && (
        <Section title="Vitals">
          <dl>
            <Field label="Blood Pressure" value={vitals.bp} />
            <Field label="Pulse" value={vitals.pulse} />
            <Field label="Temperature" value={vitals.temp} />
            <Field label="SpO2" value={vitals.spo2} />
            <Field label="Resp. Rate" value={vitals.rr} />
            <Field label="Weight" value={vitals.weight} />
            <Field label="Height" value={vitals.height} />
          </dl>
        </Section>
      )}

      {/* Lab Results */}
      <Section title={docType === "diagnostic_report" ? "Observations / Lab Results" : "Investigations"}>
        <ListTable
          items={((ext.observations ?? ext.investigations) as Record<string, unknown>[]) ?? []}
          columns={["parameter", "result", "unit", "reference_range", "is_abnormal"]}
        />
      </Section>

      {/* Medications */}
      {docType === "discharge_summary" && (
        <Section title="Medications">
          <ListTable
            items={(ext.medications as Record<string, unknown>[]) ?? []}
            columns={["drug", "dosage", "frequency", "duration", "route"]}
          />
        </Section>
      )}

      {/* Lab / Report info */}
      {docType === "diagnostic_report" && (
        <Section title="Laboratory">
          <dl>
            <Field label="Lab Name" value={(ext.laboratory as Record<string,unknown>)?.name} />
            <Field label="Report Date" value={ext.report_date} />
            <Field label="Sample Date" value={ext.sample_date} />
            <Field label="Referring Dr." value={ext.referring_doctor} />
            <Field label="Category" value={ext.test_category} />
            <Field label="Interpretation" value={ext.interpretation} />
          </dl>
        </Section>
      )}
    </div>
  );
}
