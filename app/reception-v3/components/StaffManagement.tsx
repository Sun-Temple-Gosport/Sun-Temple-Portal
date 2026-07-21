"use client";

import { useEffect, useState } from "react";
import EditStaff from "./EditStaff";
import { supabase } from "../lib/supabase";
import AddStaff from "./AddStaff";

type StaffMember = {
  id: string;
  full_name: string;
  email: string | null;
  role: string | null;
  disabled: boolean;
};

export default function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] =
    useState<StaffMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("Owner session could not be found.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/staff/list", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(result.error || "Could not load staff members.");
        setLoading(false);
        return;
      }

      setStaff(result.staff ?? []);
    } catch (error) {
      console.error("Could not connect to the staff list API.", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
            Owner Access
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            Staff Management
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black hover:bg-amber-300"
        >
          Add Staff Member
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                Name
              </th>

              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                Email
              </th>

              <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                Status
              </th>

              <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center font-semibold text-slate-400"
                >
                  Loading staff members...
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr
                  key={member.id}
                  className="border-t border-slate-800"
                >
                  <td className="px-6 py-5 font-semibold text-white">
                    {member.full_name}
                  </td>

                  <td className="px-6 py-5 text-slate-300">
                    {member.email ?? "-"}
                  </td>

                  <td className="px-6 py-5">
                    {member.disabled ? (
                      <span className="rounded-full bg-orange-500/20 px-3 py-1 text-sm font-bold text-orange-400">
                        🟠 Disabled
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-400">
                        🟢 Active
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStaff(member);
                        setEditOpen(true);
                      }}
                      className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:border-amber-400 hover:text-amber-400"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddStaff
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          loadStaff();
        }}
      />

      <EditStaff
        open={editOpen}
        staff={selectedStaff}
        onClose={() => {
          setEditOpen(false);
          setSelectedStaff(null);
          loadStaff();
        }}
      />
    </section>
  );
}