import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// Set base URL once — all axios calls use relative paths from here
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

useEffect(() => {
  // Clear any existing session on app load — always start fresh
  localStorage.removeItem("token")
  delete axios.defaults.headers.common["Authorization"]
  setLoading(false)
}, [])

 const fetchProfile = async () => {
    try {
        const { data } = await axios.get("/api/auth/profile");
        setUser(data);
    } catch (err) {
    if (err.response?.status !== 401) {
        console.error("Profile fetch error:", err);
    }

    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];

    setUser(null);
} finally {
        setLoading(false);
    }
};

  const login = async (email, password, role) => {
    const { data } = await axios.post(
        "/api/auth/login",
        { email, password, role }
    );

    const t = data.token;

    localStorage.setItem("token", t);

    axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;

    setUser(data.user);
    setToken(t);

    return data.user;
};

  const signup = async (formData) => {
    const { data } = await axios.post(
        "/api/auth/signup",
        formData
    );

    return data;
};

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);