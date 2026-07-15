import { useState } from "react";

export function useDashboard() {
  const [salesToday, setSalesToday] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [customersToday, setCustomersToday] = useState(0);

  const [revenueToday, setRevenueToday] = useState(0);
  const [cardRevenueToday, setCardRevenueToday] = useState(0);
  const [cashRevenueToday, setCashRevenueToday] = useState(0);
  const [complimentaryToday, setComplimentaryToday] = useState(0);

  const [minutesSoldToday, setMinutesSoldToday] = useState(0);

  return {
    salesToday,
    setSalesToday,

    sessionsToday,
    setSessionsToday,

    customersToday,
    setCustomersToday,

    revenueToday,
    setRevenueToday,

    cardRevenueToday,
    setCardRevenueToday,

    cashRevenueToday,
    setCashRevenueToday,

    complimentaryToday,
    setComplimentaryToday,

    minutesSoldToday,
    setMinutesSoldToday,
  };
}