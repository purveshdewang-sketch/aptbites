import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerLocalNotificationOpenListener } from "../lib/nefoLocalNotifications";

export default function LocalNotificationBootstrap() {
  const navigate = useNavigate();

  useEffect(() => {
    let removeListener = () => {};
    let cancelled = false;

    async function initialiseListener() {
      const cleanup =
        await registerLocalNotificationOpenListener(
          (extra) => {
            const route =
              typeof extra?.route === "string"
                ? extra.route
                : "/";

            navigate(route);
          }
        );

      if (cancelled) {
        cleanup();
        return;
      }

      removeListener = cleanup;
    }

    initialiseListener();

    return () => {
      cancelled = true;
      removeListener();
    };
  }, [navigate]);

  return null;
}
