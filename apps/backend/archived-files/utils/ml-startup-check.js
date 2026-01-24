/**
 * ML Startup Check
 * Validates TensorFlow.js availability during server startup
 */

export async function validateMLStartup() {
  console.log('🔍 Validating ML system startup...');
  
  const results = {
    tensorflow_available: false,
    backend_initialized: false,
    models_ready: false,
    startup_time: null,
    error: null
  };
  
  const startTime = Date.now();
  
  try {
    // Test TensorFlow.js import and initialization
    const tf = await import('@tensorflow/tfjs');
    await import('@tensorflow/tfjs-backend-cpu');
    
    // Initialize backend
    await tf.ready();
    results.tensorflow_available = true;
    results.backend_initialized = true;
    
    console.log(`  ✅ TensorFlow.js loaded with ${tf.getBackend()} backend`);
    
    // Test basic model creation
    const testModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [2], units: 4, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    // Test prediction
    const testInput = tf.tensor2d([[1, 2]]);
    const testPrediction = testModel.predict(testInput);
    await testPrediction.data();
    
    // Cleanup
    testInput.dispose();
    testPrediction.dispose();
    testModel.dispose();
    
    results.models_ready = true;
    results.startup_time = Date.now() - startTime;
    
    console.log(`  ✅ ML system validated in ${results.startup_time}ms`);
    
    return results;
    
  } catch (error) {
    results.error = error.message;
    results.startup_time = Date.now() - startTime;
    
    console.warn(`  ⚠️  ML system validation failed: ${error.message}`);
    console.warn(`  ℹ️  Continuing with statistical fallbacks...`);
    
    return results;
  }
}

export function logMLCapabilities(mlEnabled, models) {
  console.log('\n🧠 ML System Capabilities:');
  console.log(`  • TensorFlow.js: ${mlEnabled ? '✅ Available' : '❌ Unavailable'}`);
  
  if (mlEnabled && models) {
    const modelStatus = {
      engagement: models.engagement ? '✅' : '❌',
      impact: models.impact ? '✅' : '❌', 
      growth: models.growth ? '✅' : '❌',
      collaboration: models.collaboration ? '✅' : '❌'
    };
    
    console.log('  • Models:');
    console.log(`    - Engagement Prediction: ${modelStatus.engagement}`);
    console.log(`    - Impact Scoring: ${modelStatus.impact}`);
    console.log(`    - Growth Forecasting: ${modelStatus.growth}`);
    console.log(`    - Collaboration Detection: ${modelStatus.collaboration}`);
  } else {
    console.log('  • Models: Using statistical fallbacks');
  }
  
  console.log('  • Health Check: GET /api/ml/health');
  console.log('  • Diagnostics: POST /api/ml/test');
  console.log('');
}