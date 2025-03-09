import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function useAuthUser() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      console.log("Logged-in user:", user);
      if (userError || !user) {
        setError("User not logged in");
      } else {
        setUser(user);
      }
    };
    fetchUser();
  }, []);

  return { user, error };
}
