import { z } from 'zod';
export declare const userIdParamSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export declare const tripStatsQuerySchema: z.ZodObject<{
    timeRange: z.ZodDefault<z.ZodOptional<z.ZodEnum<["week", "month", "year", "all"]>>>;
}, "strip", z.ZodTypeAny, {
    timeRange: "week" | "month" | "year" | "all";
}, {
    timeRange?: "week" | "month" | "year" | "all" | undefined;
}>;
//# sourceMappingURL=user-params.d.ts.map