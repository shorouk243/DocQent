import apiClient from './client';

export interface AIRequest {
  context: string;
  question: string;
}

export interface AIResponse {
  answer: string;
}

export const aiApi = {
  ask: async (request: AIRequest): Promise<AIResponse> => {
    const response = await apiClient.post('/ai/ask', request, {
      responseType: 'text',
    });
    return { answer: response.data as string };
  },
  
  // Simulate streaming by returning the full response and letting the component handle animation
  // In the future, this can be replaced with Server-Sent Events (SSE) or WebSocket streaming
  askStreaming: async (
    request: AIRequest,
    onChunk: (chunk: string) => void,
    options?: { useWeb?: boolean }
  ): Promise<void> => {
    try {
      const baseUrl = apiClient.defaults.baseURL || '';
      const endpoint = options?.useWeb ? '/ai/ask_web' : '/ai/ask';
      
      console.log('🌐 Frontend: Sending AI request', {
        endpoint,
        useWeb: options?.useWeb,
        question: request.question,
        contextLength: request.context?.length || 0,
      });
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to get AI response');
      }

      if (!response.body) {
        const text = await response.text();
        onChunk(text);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        onChunk(fullText);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to get AI response';
      onChunk(`Error: ${errorMessage}`);
      throw error;
    }
  },
};
