"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function ErrorLogPage() {
  const [errors, setErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false); // Track auth issues

  useEffect(() => {
    const fetchErrorLog = async () => {
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.warn("No token found. User needs to log in.");
        setAuthError(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("https://ai-tutor-production-43fe.up.railway.app/error-log", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // The VIP Pass
          }
        });

        if (response.ok) {
          const data = await response.json();
          setErrors(data);
          setAuthError(false);
        } else {
          console.error("Failed to authenticate with backend. Status:", response.status);
          setAuthError(true);
        }
      } catch (error) {
        console.error("Error fetching error log:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchErrorLog();
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-6 md:p-12 relative z-10">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Mistake Locker
          </h1>
        </div>

        {/* Content */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 shadow-xl backdrop-blur-sm"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <RefreshCcw className="w-8 h-8 animate-spin mb-4 text-violet-500" />
              <p>Decrypting your logs...</p>
            </div>
          ) : authError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Authentication Failed</h2>
              <p className="text-zinc-500 mb-6">Your session has expired or is invalid.</p>
              <Link href="/login" className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors">
                 Log In Again
              </Link>
            </div>
          ) : errors.length > 0 ? (
            <div className="space-y-4">
              {errors.map((err, idx) => (
                <div key={idx} className="p-4 bg-zinc-950/50 border border-white/5 rounded-xl">
                  <p className="text-sm text-zinc-400">{err.message || "Unknown error logged."}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No mistakes found!</h2>
              <p className="text-zinc-500">Take a mock test. Any questions you get wrong will appear here so the AI can tutor you on them.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}