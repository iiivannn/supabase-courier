import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function useAuthUser() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        setError(error.message);
      } else {
        setUser(user);
      }
    };
    fetchUser();
  }, []);

  return { user, error };
}
