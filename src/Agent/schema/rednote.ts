import { z } from "zod";

export const getRednoteCommentSchema = () => {
    return z.array(
        z.object({
            comment: z.string()
                .min(1)
                .max(300)
                .describe("A thoughtful and engaging comment that adds value to the conversation")
        })
    );
}; 