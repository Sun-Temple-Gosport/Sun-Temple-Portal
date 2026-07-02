"use client";

export default function TestButton() {
  async function addMinutes() {
    const res = await fetch("/api/test/add-minutes", {
      method: "POST",
    });

    const data = await res.json();

    if (data.success) {
      alert(`Success! New balance: ${data.newBalance} minutes`);
      window.location.reload();
    } else {
      alert(data.error || "Something went wrong");
    }
  }

  return (
    <button
      onClick={addMinutes}
      className="mt-6 rounded-full bg-[#d6a84f] px-6 py-4 font-bold text-black"
    >
      Test: Add 60 Minutes
    </button>
  );
}