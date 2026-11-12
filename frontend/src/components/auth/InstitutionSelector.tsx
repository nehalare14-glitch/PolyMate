"use client";

import { useEffect, useMemo, useState } from "react";
import { telanganaDistricts } from "@/data/telangana-districts";

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

export default function InstitutionSelector({
  value,
  onChange,
}: Props) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [district, setDistrict] = useState("");
  const [management, setManagement] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          { signal: controller.signal, cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status}`);
        }

        const data: InstitutionResponse = await response.json();

        if (!Array.isArray(data.institutions)) {
          throw new Error("Invalid institution API response");
        }

        setInstitutions(data.institutions);
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
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return institutions.filter((college) => {
      const districtMatches =
        !district || college.district === district;

      const managementMatches =
        !management || college.management === management;

      const searchMatches =
        `${college.name} ${college.college_code} ${college.district}`
          .toLowerCase()
          .includes(query);

      return (
        districtMatches &&
        managementMatches &&
        searchMatches
      );
    });
  }, [institutions, district, management, search]);

  const inputClass =
    "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-[#111827] dark:text-slate-100";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#111827] dark:text-slate-100";

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>
          District (Telangana)
        </label>
        <select
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            onChange("");
          }}
          className={inputClass}
        >
          <option value="">All districts</option>
          {telanganaDistricts.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>
          College Management
        </label>
        <select
          value={management}
          onChange={(e) => {
            setManagement(e.target.value);
            onChange("");
          }}
          className={inputClass}
        >
          <option value="">All institutions</option>
          <option value="Government">Government</option>
          <option value="Private">Private</option>
          <option value="Aided">Aided</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>
          Search Polytechnic College
        </label>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange("");
          }}
          placeholder="Search college name or code"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>
          Institution
        </label>

        <select
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || !!error || filtered.length === 0}
          className={inputClass}
        >
          <option value="">
            {loading
              ? "Loading institutions..."
              : error
                ? "Unable to load institutions"
                : filtered.length === 0
                  ? "No institutions available"
                  : "Select Polytechnic College"}
          </option>

          {filtered.map((college) => (
            <option
              key={college.college_code}
              value={college.college_code}
            >
              {college.name} — {college.district}
            </option>
          ))}
        </select>

        {error ? (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error}. Check that the Flask backend is running
            and allows requests from the frontend.
          </p>
        ) : (
          <p className="mt-2 text-xs text-[#111827] dark:text-slate-100">
            {loading
              ? "Loading colleges from PolyMate..."
              : `${filtered.length} institutions available for the selected filters.`}
          </p>
        )}
      </div>
    </div>
  );
}

