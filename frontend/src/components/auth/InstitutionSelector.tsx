"use client";

import { useEffect, useId, useMemo, useState } from "react";

interface Props {
  value: string;
  onChange: (code: string) => void;
}

interface Institution {
  college_code: string;
  name: string;
  district: string;
  management: string;
}

interface InstitutionResponse {
  count: number;
  institutions: Institution[];
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default function InstitutionSelector({
  value,
  onChange,
}: Props) {
  const id = useId();

  const [institutions, setInstitutions] =
    useState<Institution[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInstitutions() {
      setLoading(true);
      setError("");

      try {
        const baseUrl = (
          process.env.NEXT_PUBLIC_API_URL ||
          "http://127.0.0.1:5000"
        ).replace(/\/+$/, "");

        const response = await fetch(
          `${baseUrl}/api/institutions`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `API returned HTTP ${response.status}`
          );
        }

        const data: InstitutionResponse =
          await response.json();

        if (!Array.isArray(data.institutions)) {
          throw new Error(
            "Invalid institution API response"
          );
        }

        if (!controller.signal.aborted) {
          setInstitutions(data.institutions);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load institutions"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadInstitutions();

    return () => controller.abort();
  }, [retry]);

  const filtered = useMemo(() => {
    const query = normalize(search);

    if (!query) {
      return institutions;
    }

    // Numeric search: college code
    if (/^\d+$/.test(query)) {
      return institutions
        .filter((college) =>
          college.college_code.startsWith(query)
        )
        .sort((a, b) => {
          if (a.college_code === query) return -1;
          if (b.college_code === query) return 1;
          return a.name.localeCompare(b.name);
        });
    }

    // College name, code or district
    const words = query.split(/\s+/);

    return institutions.filter((college) => {
      const searchable = normalize(
        `${college.name} ${college.college_code} ${college.district}`
      );

      return words.every((word) =>
        searchable.includes(word)
      );
    });
  }, [institutions, search]);

  const selectedCollege = institutions.find(
    (college) => college.college_code === value
  );

  const inputClass =
    "w-full min-w-0 max-w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-[#111827] dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#111827] dark:text-slate-100";

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <label
          htmlFor={`${id}-search`}
          className={labelClass}
        >
          Search College
        </label>

        <input
          id={`${id}-search`}
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange("");
          }}
          placeholder="Enter college name or code"
          autoComplete="off"
          className={inputClass}
        />

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Example: Kshatriya or 379
        </p>
      </div>

      <div>
        <label
          htmlFor={`${id}-institution`}
          className={labelClass}
        >
          Select Institution
        </label>

        <select
          id={`${id}-institution`}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={
            loading ||
            !!error ||
            filtered.length === 0
          }
          className={inputClass}
        >
          <option value="">
            {loading
              ? "Loading institutions..."
              : error
                ? "Unable to load institutions"
                : filtered.length === 0
                  ? "No matching institutions"
                  : "Select your institution"}
          </option>

          {filtered.map((college) => (
            <option
              key={college.college_code}
              value={college.college_code}
            >
              {college.name} ({college.college_code})
            </option>
          ))}
        </select>

        {error ? (
          <div className="mt-2 space-y-2">
            <p
              role="alert"
              className="text-xs text-red-600 dark:text-red-400"
            >
              Unable to load institutions. Please try again.
            </p>

            <button
              type="button"
              onClick={() => setRetry((n) => n + 1)}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400"
            >
              Retry
            </button>
          </div>
        ) : (
          <p
            aria-live="polite"
            className="mt-2 text-xs text-slate-500 dark:text-slate-400"
          >
            {loading
              ? "Loading colleges from PolyMate..."
              : `${filtered.length} institutions available`}
          </p>
        )}
      </div>

      {selectedCollege && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Selected Institution
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
            {selectedCollege.name}
          </p>

          <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <p>
              College Code: {selectedCollege.college_code}
            </p>
            <p>
              District: {selectedCollege.district}
            </p>
            <p>
              Management: {selectedCollege.management}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
