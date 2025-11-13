const OpenAI = require('openai');

async function testOpenAI() {
  try {
    console.log('Testing OpenAI integration...\n');
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Mock deal data (simulating what would come from database)
    const mockDeal = {
      property_type: 'Multifamily',
      loan_amount: 5000000,
      property_value: 7500000,
      ltv: 66.67,
      dscr: 1.45,
      property_address: '123 Main Street, Austin, TX 78701',
      borrower_credit_score: 740,
      occupancy_rate: 94,
      noi: 650000,
      interest_rate: 6.25
    };
    
    console.log('📊 Mock Deal Data:');
    console.log(JSON.stringify(mockDeal, null, 2));
    console.log('\n🤖 Generating Executive Summary with GPT-4.1-mini...\n');
    
    // Create prompt (same as in production code)
    const prompt = `Generate a concise 1-2 paragraph Executive Summary for this commercial real estate loan. The summary must be suitable for a Credit Committee and focus on Key Strengths, Risks, and a Final Recommendation. Use the provided data points only.

**Deal Data:**
- Property Type: ${mockDeal.property_type}
- Loan Amount: $${mockDeal.loan_amount.toLocaleString()}
- LTV (Loan-to-Value): ${mockDeal.ltv}%
- DSCR (Debt Service Coverage Ratio): ${mockDeal.dscr}
- Property Location: ${mockDeal.property_address}
- Borrower Credit Score: ${mockDeal.borrower_credit_score}
- Property Value: $${mockDeal.property_value.toLocaleString()}
- Occupancy Rate: ${mockDeal.occupancy_rate}%
- Net Operating Income: $${mockDeal.noi.toLocaleString()}
- Interest Rate: ${mockDeal.interest_rate}%`;
    
    // Call OpenAI API
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an expert commercial real estate underwriter. Your tone is professional and factual. Focus on providing clear, actionable insights for Credit Committee review." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 400
    });
    
    const endTime = Date.now();
    const summary = completion.choices[0].message.content.trim();
    
    // Display results
    console.log('✅ SUCCESS! Executive Summary Generated:\n');
    console.log('═'.repeat(80));
    console.log(summary);
    console.log('═'.repeat(80));
    
    console.log('\n📈 Performance Metrics:');
    console.log(`   Response Time: ${endTime - startTime}ms`);
    console.log(`   Model: ${completion.model}`);
    console.log(`   Tokens Used: ${completion.usage.total_tokens} (${completion.usage.prompt_tokens} prompt + ${completion.usage.completion_tokens} completion)`);
    console.log(`   Estimated Cost: $${(completion.usage.total_tokens / 1000000 * 0.15).toFixed(6)}`);
    
    console.log('\n🎯 Production Response Format:');
    const response = {
      deal_id: 'mock-123',
      summary: summary,
      generated_at: new Date().toISOString(),
      model: "gpt-4.1-mini",
      status: "success",
      deal_info: {
        property_type: mockDeal.property_type,
        loan_amount: mockDeal.loan_amount,
        ltv: mockDeal.ltv,
        dscr: mockDeal.dscr
      }
    };
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testOpenAI().then(() => {
  console.log('\n✅ Test complete!');
  process.exit(0);
});
