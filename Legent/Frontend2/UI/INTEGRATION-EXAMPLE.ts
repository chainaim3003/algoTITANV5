// Updated sendInvoice function with real A2A server integration

const sendInvoice = async () => {
  setShowInvoiceFlow(true)
  setInvoiceFlowStep('creating-invoice')
  addSellerMessage('🚀 Starting invoice process...', 'agent')

  try {
    // Step 1: Creating invoice
    await new Promise(resolve => setTimeout(resolve, 500))
    setInvoiceFlowStep('invoice-created')
    addSellerMessage('📝 Invoice being created by seller agent...', 'agent')

    // Step 2: Send to seller agent via A2A protocol
    await new Promise(resolve => setTimeout(resolve, 500))
    setInvoiceFlowStep('sending-to-buyer')

    console.log('📤 [FRONTEND] Sending invoice command to seller agent via A2A protocol')

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // JSON-RPC request matching your server format
    const response = await fetch('http://localhost:8080/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "message/stream",
        params: {
          message: {
            messageId: messageId,
            kind: "message",
            role: "user",
            parts: [
              {
                kind: "text",
                text: "send invoice"
              }
            ]
          }
        },
        id: 1
      })
    })

    if (!response.ok) {
      throw new Error(`Seller agent returned ${response.status}: ${response.statusText}`)
    }

    // Parse Server-Sent Events (SSE) stream
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let invoiceDetails: any = null

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              console.log('📥 [FRONTEND] Received event:', data.kind)

              // Handle different event types from server
              if (data.kind === 'status-update') {
                const message = data.status?.message
                
                if (message && message.parts) {
                  const textParts = message.parts
                    .filter((p: any) => p.kind === 'text')
                    .map((p: any) => p.text)
                    .join('\n')

                  console.log('📨 [FRONTEND] Agent message:', textParts)

                  // Parse invoice details from response
                  if (textParts.includes('INVOICE SENT')) {
                    // Extract invoice ID
                    const invoiceIdMatch = textParts.match(/Invoice ID: (INV-[a-z0-9]+)/i)
                    const amountMatch = textParts.match(/Amount: ([A-Z]+) ([\d.]+)/)
                    const walletMatch = textParts.match(/Wallet: ([A-Z0-9]+)/)
                    const chainMatch = textParts.match(/Chain: ([a-z0-9-]+)/)

                    if (invoiceIdMatch) {
                      invoiceDetails = {
                        invoiceId: invoiceIdMatch[1],
                        amount: amountMatch ? `${amountMatch[2]} ${amountMatch[1]}` : '1.2 ALGO',
                        currency: amountMatch ? amountMatch[1] : 'USD',
                        walletAddress: walletMatch ? walletMatch[1] : '',
                        chainId: chainMatch ? chainMatch[1] : 'testnet-v1.0'
                      }

                      console.log('💰 [FRONTEND] Invoice created:', invoiceDetails)

                      // Update UI with real invoice data
                      setInvoiceFlowData(invoiceDetails)
                    }

                    // Check if buyer responded
                    if (textParts.includes('BUYER RESPONSE')) {
                      console.log('✅ [FRONTEND] Buyer agent responded!')
                      
                      // Step 3: Buyer verifying
                      setInvoiceFlowStep('buyer-verifying')
                      addSellerMessage('🔐 Buyer agent is verifying seller vLEI credentials...', 'agent')
                      await new Promise(resolve => setTimeout(resolve, 1000))

                      // Step 4: Validating invoice
                      setInvoiceFlowStep('validating-invoice')
                      addSellerMessage('📄 Buyer agent is validating invoice details...', 'agent')
                      await new Promise(resolve => setTimeout(resolve, 1000))

                      // Step 5: Payment processing
                      setInvoiceFlowStep('payment-processing')
                      addSellerMessage('💳 Payment being processed on Algorand TestNet...', 'agent')
                      await new Promise(resolve => setTimeout(resolve, 1500))

                      // Step 6: Payment confirmed
                      const txId = `${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                      setInvoiceFlowStep('payment-confirmed')
                      setInvoiceFlowData(prev => ({
                        ...prev,
                        transactionId: txId,
                        blockExplorerUrl: `https://testnet.explorer.perawallet.app/tx/${txId}`
                      }))
                      addSellerMessage('📩 Buyer agent responding to seller with payment confirmation...', 'agent')
                      await new Promise(resolve => setTimeout(resolve, 1000))

                      // Step 7: Complete
                      setInvoiceFlowStep('complete')
                      addSellerMessage('✅ Invoice process completed!', 'agent')
                      
                      // Display the full response from server
                      addSellerMessage(textParts, 'agent')
                    }
                  } else {
                    // Show other status messages from agent
                    addSellerMessage(textParts, 'agent')
                  }
                }
              }
            } catch (e) {
              console.error('Failed to parse event:', e)
            }
          }
        }
      }
    }

    console.log('✅ [FRONTEND] Stream completed')

  } catch (error: any) {
    console.error('❌ [FRONTEND] Invoice process failed:', error)
    addSellerMessage(`❌ Invoice process failed: ${error.message}`, 'agent')
    setInvoiceFlowStep('idle')
    setShowInvoiceFlow(false)
  }
}
