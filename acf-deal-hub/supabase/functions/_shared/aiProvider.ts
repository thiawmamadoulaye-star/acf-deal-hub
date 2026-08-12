// Abstraction du fournisseur d'IA générative (OpenAI ou Azure OpenAI).
// Configurez via : supabase secrets set OPENAI_API_KEY=sk-xxxxx

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callChatCompletion(messages: ChatMessage[], temperature = 0.4): Promise<string> {
  const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
  const azureKey = Deno.env.get('AZURE_OPENAI_API_KEY')
  const azureDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT')
  const azureApiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') ?? '2024-06-01'

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  const openaiModel = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

  if (azureEndpoint && azureKey && azureDeployment) {
    const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': azureKey },
      body: JSON.stringify({ messages, temperature }),
    })
    if (!res.ok) throw new Error(`Azure OpenAI error (${res.status}): ${await res.text()}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: openaiModel, messages, temperature }),
    })
    if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  throw new Error(
    "Aucun fournisseur d'IA configuré. Définissez OPENAI_API_KEY ou " +
      'AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / AZURE_OPENAI_DEPLOYMENT.'
  )
}
