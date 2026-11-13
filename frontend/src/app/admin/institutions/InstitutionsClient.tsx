"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2, Landmark, School, GraduationCap,
  Search, ArrowLeft, RefreshCw, Eye, X,
  ChevronLeft, ChevronRight
} from "lucide-react";

type Institution = {
  college_code: string;
  name: string;
  district: string;
  management: string;
};

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:5000";

const card =
  "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900";

const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800";

const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800";

export default function InstitutionsClient() {
  const [institutions, setInstitutions] =
    useState<Institution[]>([]);

  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [management, setManagement] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [selected, setSelected] =
    useState<Institution | null>(null);

  const limit = 15;

  function refreshInstitutions() {
    setLoading(true);
    setError("");
    void loadInstitutions();
  }

  async function loadInstitutions() {

    try {
      const response = await fetch(
        `${API}/api/institutions`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load institutions."
        );
      }

      setInstitutions(data.institutions ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load institutions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInstitutions();
  }, []);

  const districts = useMemo(() => {
    return Array.from(
      new Set(
        institutions.map(i => i.district).filter(Boolean)
      )
    ).sort();
  }, [institutions]);

  const managementTypes = useMemo(() => {
    return Array.from(
      new Set(
        institutions.map(i => i.management).filter(Boolean)
      )
    ).sort();
  }, [institutions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return institutions.filter(i => {
      const matchesSearch =
        i.name.toLowerCase().includes(query) ||
        String(i.college_code).includes(query);

      return matchesSearch &&
        (!district || i.district === district) &&
        (!management || i.management === management);
    });
  }, [institutions, search, district, management]);

  const totalPages = Math.max(
    1, Math.ceil(filtered.length / limit)
  );

  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  const statistics = [
    {
      label: "Total Institutions",
      value: institutions.length,
      icon: Building2,
      filter: "",
    },
    {
      label: "Government",
      value: institutions.filter(
        i => i.management === "Government"
      ).length,
      icon: Landmark,
      filter: "Government",
    },
    {
      label: "Private",
      value: institutions.filter(
        i => i.management === "Private"
      ).length,
      icon: School,
      filter: "Private",
    },
    {
      label: "Aided",
      value: institutions.filter(
        i => i.management === "Aided"
      ).length,
      icon: GraduationCap,
      filter: "Aided",
    },
  ];

  return (
    <main className="min-h-dvh bg-slate-50 p-3 sm:p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-8">

      <div className="mx-auto max-w-7xl space-y-6">

        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Institutions
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage Telangana polytechnic institutions.
            </p>
          </div>

          <button
            className={btn}
            disabled={loading}
            onClick={refreshInstitutions}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-4 lg:grid-cols-4">
          {statistics.map(({ label, value, icon: Icon, filter }) => (
            <button
              key={label}
              className={`${card} text-left`}
              onClick={() => {
                setManagement(filter);
                setPage(1);
              }}
            >
              <Icon size={24} className="text-blue-600" />

              <p className="mt-4 text-3xl font-bold">
                {loading ? "-" : value}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {label}
              </p>
            </button>
          ))}
        </div>

        <section className={card}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">

            <div className="relative md:col-span-2">
              <Search
                size={18}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                className={`${field} pl-10`}
                placeholder="Search college name or code..."
                aria-label="Search institutions"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className={field}
              aria-label="District"
              value={district}
              onChange={e => {
                setDistrict(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Districts</option>

              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              className={field}
              aria-label="Management"
              value={management}
              onChange={e => {
                setManagement(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Management</option>

              {managementTypes.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button
            className="mt-4 text-sm font-medium text-blue-600"
            onClick={() => {
              setSearch("");
              setDistrict("");
              setManagement("");
              setPage(1);
            }}
          >
            Clear Filters
          </button>
        </section>

        <section className={card}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Institution Directory
            </h2>

            <span className="text-sm text-slate-500">
              {filtered.length} institutions
            </span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Loading institutions...
            </p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No institutions found.
            </p>
          ) : (
            <div className="max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <tr>
                    {[
                      "College Code",
                      "Institution Name",
                      "District",
                      "Management",
                      "Actions"
                    ].map(h => (
                      <th key={h} className="p-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visible.map(i => (
                    <tr
                      key={i.college_code}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="p-3 font-semibold">
                        {i.college_code}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Building2
                            size={19}
                            className="shrink-0 text-blue-600"
                          />
                          {i.name}
                        </div>
                      </td>

                      <td className="p-3">
                        {i.district || "Not assigned"}
                      </td>

                      <td className="p-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                          {i.management}
                        </span>
                      </td>

                      <td className="p-3">
                        <button
                          className={btn}
                          onClick={() => setSelected(i)}
                        >
                          <Eye size={16} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <button
              className={btn}
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={17} /> Previous
            </button>

            <span className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </span>

            <button
              className={btn}
              disabled={currentPage >= totalPages || loading}
              onClick={() => setPage(currentPage + 1)}
            >
              Next <ChevronRight size={17} />
            </button>
          </div>
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Institution details"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Institution Details
              </h2>

              <button
                aria-label="Close details"
                onClick={() => setSelected(null)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {[
                ["College Code", selected.college_code],
                ["Institution Name", selected.name],
                ["District", selected.district],
                ["Management", selected.management],
                ["State", "Telangana"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 font-medium">
                    {value || "Not available"}
                  </p>
                </div>
              ))}
            </div>

            <button
              className={`${btn} mt-6 w-full`}
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
