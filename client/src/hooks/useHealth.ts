import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

export interface HealthResponse {
  status: string;
  uptime?: number;
}

export function useHealth() {
  return useQuery<HealthResponse>({
    queryKey: ["/api/health"],
    queryFn: () => apiGet<HealthResponse>("/api/health"),
  });
}
