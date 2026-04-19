"use client";

const helplines = [
  {
    name: "Women Helpline",
    number: "1091",
    description: "For women in distress"
  },
  {
    name: "Emergency (All-in-one)",
    number: "112",
    description: "Police / Fire / Ambulance"
  },
  {
    name: "Police",
    number: "100",
    description: "Immediate police assistance"
  },
  {
    name: "Ambulance",
    number: "102",
    description: "Medical emergency"
  },
  {
    name: "Domestic Abuse Helpline",
    number: "181",
    description: "Support for domestic violence"
  },
  {
    name: "Child Helpline",
    number: "1098",
    description: "For children in danger"
  }
];

export default function EmergencyPage() {
  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <div className="p-6">
      
      {/* 🔥 Header */}
      <h1 className="text-2xl font-semibold text-foreground mb-6">
        Emergency Helplines
      </h1>

      {/* 🔥 Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {helplines.map((item, index) => (
          <div
            key={index}
            className="
              bg-card
              text-card-foreground
              border border-border
              rounded-2xl
              p-5
              backdrop-blur
              shadow-sm
              hover:shadow-lg
              transition
              duration-300
              dark:hover:border-pink-500/40
            "
          >
            {/* Title */}
            <h2 className="text-lg font-semibold mb-1">
              {item.name}
            </h2>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4">
              {item.description}
            </p>

            {/* Number */}
            <p className="text-xl font-bold text-primary mb-4">
              {item.number}
            </p>

            {/* Call Button */}
            <button
              onClick={() => handleCall(item.number)}
              className="
                w-full
                py-2
                rounded-xl
                font-medium
                transition
                duration-200

                bg-gradient-to-r
                from-pink-500
                to-red-500
                text-white

                hover:from-pink-600
                hover:to-red-600

                shadow-md
                dark:shadow-[0_0_10px_rgba(255,0,80,0.2)]
              "
            >
              📞 Call Now
            </button>
          </div>
        ))}

      </div>
    </div>
  );
}