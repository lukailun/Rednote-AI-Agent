export interface CommentPromptConfig {
    template: string;
    maxCharacters: number;
}

export const REDNOTE_PROMPTS: CommentPromptConfig = {
    template: `Craft a thoughtful, engaging, and mature reply to the following post: "{title}
{content}". The post contains the following media: {mediaDescription}. Ensure the reply is relevant, insightful, and adds value to the conversation. It should reflect empathy and professionalism, and avoid sounding too casual or superficial. Also it should be {maxCharacters} characters or less.`,
    maxCharacters: 300
};

export const generateCommentPrompt = (
    title: string, 
    content: string, 
    mediaDescription: string,
    config: CommentPromptConfig = REDNOTE_PROMPTS
): string => {
    return config.template
        .replace('{title}', title)
        .replace('{content}', content)
        .replace('{mediaDescription}', mediaDescription)
        .replace('{maxCharacters}', config.maxCharacters.toString());
};