// "use client";

// import { useState } from "react";
// import { getAuth } from "firebase/auth";

// export default function EmergencyButton() {
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false);

//   // 📞 CALL


// const handleCall = async () => {
//   try {
//     const auth = getAuth();
//     const currentUser = auth.currentUser;

//     if (!currentUser) {
//       alert("User not logged in");
//       return;
//     }

//     const res = await fetch("/api/emergency", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({
//         action: "call",
//         uid: currentUser.uid   // ✅ ADD THIS
//       })
//     });

//     const data = await res.json();

//     if (data.type === "call") {
//       window.location.href = `tel:${data.number}`;
//     }

//     setOpen(false);
//   } catch (err) {
//     console.error(err);
//     alert("Something went wrong");
//   }
// };

//   // 📩 SMS
//   const handleSMS = async () => {
//   setLoading(true);

//   const auth = getAuth();
//   const currentUser = auth.currentUser;

//   if (!currentUser) {
//     alert("User not logged in");
//     setLoading(false);
//     return;
//   }

//   navigator.geolocation.getCurrentPosition(
//     async (pos) => {
//       try {
//         const { latitude, longitude } = pos.coords;

//         const location = `https://maps.google.com/?q=${latitude},${longitude}`;

//         const res = await fetch("/api/emergency", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json"
//           },
//           body: JSON.stringify({
//             action: "sms",
//             location,
//             uid: currentUser.uid   // ✅ FIX HERE
//           })
//         });

//         const data = await res.json();

//         console.log("SMS RESPONSE:", data);

//         if (data.success) {
//           alert("Alert sent successfully");
//         } else {
//           alert(data.error || "Failed to send alert");
//         }

//       } catch (err) {
//         console.error(err);
//         alert("Something went wrong");
//       }

//       setLoading(false);
//       setOpen(false);
//     },
//     () => {
//       alert("Location permission denied");
//       setLoading(false);
//     }
//   );
// };
//   return (
//     <>
//       {/* Floating Button */}
//       <button
//         onClick={() => setOpen(true)}
//         className="fixed bottom-6 right-6 bg-[#B21563] text-white p-4 rounded-xl z-50 hover:bg-[#911050] cursor-pointer shadow-lg shadow-[#B21563]/30 transition-all hover:scale-105 active:scale-95"
//       >
//         ⚠️
//       </button>

//       {/* Modal */}
//       {open && (
//         <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//           <div className="bg-white p-6 rounded-xl shadow-lg w-80 text-center">
//             <h2 className="text-lg mb-4 font-semibold text-black">
//               Select action
//             </h2>

//             <div className="flex flex-col gap-3">
              
//               <button
//                 onClick={handleCall}
//                 className="bg-gray-700 text-white py-2 rounded cursor-pointer"
//               >
//                 Emergency Call
//               </button>

//               <button
//                 onClick={handleSMS}
//                 disabled={loading}
//                 className="bg-blue-500 text-white py-2 rounded cursor-pointer"
//               >
//                 {loading ? "Sending..." : "Inform Contacts"}
//               </button>

//               <button
//                 onClick={() => setOpen(false)}
//                 className="text-gray-500 mt-2 cursor-pointer"
//               >
//                 Cancel
//               </button>

//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";

export default function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔥 NEW STATES
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
// 🔁 ADD THIS ABOVE handleCall
const sendSequentialSMS = async (contacts: string[], message: string) => {
  for (let i = 0; i < contacts.length; i++) {
    const number = contacts[i];

    window.location.href = `sms:${number}?body=${message}`;

    // wait so user can press send before next opens
    await new Promise((res) => setTimeout(res, 4000));
  }
};
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
          uid: currentUser.uid
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

  // 📩 SMS (unchanged)
  const handleSMS = async () => {
    setLoading(true);

    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("User not logged in");
      setLoading(false);
      return;
    }

    // 🔥 LIVE SYNC: Trigger summary generation right before sending SMS
    try {
      await fetch("/api/chat/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          uid: currentUser.uid, 
          triggerSummary: true,
          aiResponse: "EMERGENCY_TRIGGERED", // Dummy values to pass validation
          stressLevel: "high" 
        })
      });
    } catch (err) {
      console.error("Live Sync failed, proceeding with existing summary:", err);
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
              uid: currentUser.uid
            })
          });

          const data = await res.json();

          console.log("SMS RESPONSE:", data);

  if (data.success) {
  const contacts: string[] = data.contacts || [];
  const message = encodeURIComponent(data.message || "");

  if (contacts.length === 0) {
    alert("No contacts found");
    return;
  }

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 🔥 TRY MULTI-CONTACT FIRST
  const multiNumbers = contacts.join(",");

  const multiUrl = isIOS
    ? `sms:${multiNumbers}&body=${message}`
    : `sms:${multiNumbers}?body=${message}`;

  // Try opening multi-contact SMS
  window.location.href = multiUrl;

  // 🔥 FALLBACK: guide user to send one by one
  setTimeout(() => {
    if (contacts.length > 1) {
      const confirmSequential = confirm(
        "If all contacts were not added automatically, press OK to send one by one."
      );

      if (confirmSequential) {
        sendSequentialSMS(contacts, message);
      }
    }
  }, 2000);
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

  // 🔥 START COUNTDOWN
  const startCountdown = () => {
    let time = 5;
    setCountdown(time);

    // optional vibration
    navigator.vibrate?.(200);

    const id = setInterval(() => {
      time--;

      if (time === 0) {
        clearInterval(id);
        setCountdown(null);
        handleSMS(); // 🚀 trigger actual send
      } else {
        setCountdown(time);
      }
    }, 1000);

    setTimerId(id);
  };

  // 🔥 CANCEL COUNTDOWN
  const cancelCountdown = () => {
    if (timerId) {
      clearInterval(timerId);
    }
    setCountdown(null);
  };

  return (
    <>
      {/* 🔴 Floating Button */}
      <div className="tooltip-container mb-3">
        <button
          aria-describedby="help-tooltip"
          className="help-button"
          onClick={() => setOpen(true)}
        >
          Need Help?
        </button>

        <div role="tooltip" id="help-tooltip" className="tooltip">
          <i></i>
          <strong>Alert</strong> your trusties!
        </div>
      </div>

      {/* 🟡 Modal */}
{open && (
  <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">

    <div
      className="
        w-[320px]
        rounded-2xl
        p-6

        bg-card
        text-card-foreground
        border border-border

        shadow-xl
        backdrop-blur-xl
        animate-[fadeIn_0.25s_ease]

        dark:shadow-[0_0_25px_rgba(0,0,0,0.6)]
      "
    >

      {/* Header */}
      <h2 className="text-lg font-semibold mb-5">
        Select action
      </h2>

      <div className="flex flex-col gap-3">

        {/* 📞 CALL */}
        <button
          onClick={handleCall}
          className="
            w-full
            py-2.5
            rounded-xl

            bg-secondary
            text-secondary-foreground

            hover:bg-secondary/80
            transition
            duration-200

            shadow-sm
          "
        >
          📞 Emergency Call
        </button>

        {/* 📩 INFORM CONTACTS */}
        {countdown === null ? (
        <button
  onClick={startCountdown}
  className="
    w-full
    py-2.5
    rounded-xl
    font-medium
    text-white

    bg-gradient-to-r
    from-red-500
    to-pink-500

    hover:from-red-600
    hover:to-pink-600

    transition
    duration-200

    shadow-md
    dark:shadow-[0_0_12px_rgba(255,0,80,0.25)]
  "
>
  Inform Contacts
</button>
        ) : (
          <div className="relative w-full overflow-hidden rounded-xl">
            <button
              onClick={cancelCountdown}
              className="
                w-full
                py-2.5
                rounded-xl

                bg-destructive
                text-white
                animate-pulse

                shadow-md
              "
            >
              Sending in {countdown}s — Cancel
            </button>

            {/* Progress bar */}
            <div
              className="absolute bottom-0 left-0 h-1 bg-white/40"
              style={{
                width: `${(countdown / 5) * 100}%`,
                transition: "width 1s linear"
              }}
            />
          </div>
        )}

        {/* ❌ Cancel */}
        <button
          onClick={() => setOpen(false)}
          className="
            text-muted-foreground
            text-sm
            mt-2

            hover:text-foreground
            transition
          "
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