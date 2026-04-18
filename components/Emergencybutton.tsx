"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";

export default function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 📞 CALL


const handleCall = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("User not logged in");
      return;
    }

    const res = await fetch("/api/emergency", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "call",
        uid: currentUser.uid   // ✅ ADD THIS
      })
    });

    const data = await res.json();

    if (data.type === "call") {
      window.location.href = `tel:${data.number}`;
    }

    setOpen(false);
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
};

  // 📩 SMS
  const handleSMS = async () => {
  setLoading(true);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    alert("User not logged in");
    setLoading(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;

        const location = `https://maps.google.com/?q=${latitude},${longitude}`;

        const res = await fetch("/api/emergency", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "sms",
            location,
            uid: currentUser.uid   // ✅ FIX HERE
          })
        });

        const data = await res.json();

        console.log("SMS RESPONSE:", data);

        if (data.success) {
          alert("Alert sent successfully");
        } else {
          alert(data.error || "Failed to send alert");
        }

      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      }

      setLoading(false);
      setOpen(false);
    },
    () => {
      alert("Location permission denied");
      setLoading(false);
    }
  );
};
  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-red-800 text-white p-4 rounded-full z-50 hover:bg-gray-800 cursor-pointer"
      >
        ⚠️
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-80 text-center">
            <h2 className="text-lg mb-4 font-semibold text-black">
              Select action
            </h2>

            <div className="flex flex-col gap-3">
              
              <button
                onClick={handleCall}
                className="bg-gray-700 text-white py-2 rounded cursor-pointer"
              >
                Emergency Call
              </button>

              <button
                onClick={handleSMS}
                disabled={loading}
                className="bg-blue-500 text-white py-2 rounded cursor-pointer"
              >
                {loading ? "Sending..." : "Inform Contacts"}
              </button>

              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 mt-2 cursor-pointer"
              >
                Cancel
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}