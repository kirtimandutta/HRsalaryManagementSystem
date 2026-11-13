/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { describe, expect, it } from "vitest";
import { MetricCard } from "@/components/metric-card";

describe("MetricCard", () => {
  it("renders the payroll figure and its explanation", () => {
    render(<MetricCard icon={Users} label="Headcount" value="9,400" hint="Active and on leave" />);
    expect(screen.getByText("Headcount")).toBeInTheDocument();
    expect(screen.getByText("9,400")).toBeInTheDocument();
    expect(screen.getByText("Active and on leave")).toBeInTheDocument();
  });
});
