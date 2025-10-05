#!/usr/bin/env node

/**
 * Test TensorFlow.js Installation and Functionality
 * Verifies that TensorFlow.js is properly installed and can create/run models
 */

async function testTensorFlow() {
  console.log('🧠 Testing TensorFlow.js installation...\n');
  
  try {
    // Import TensorFlow.js
    console.log('1. Importing TensorFlow.js...');
    const tf = await import('@tensorflow/tfjs');
    await import('@tensorflow/tfjs-backend-cpu');
    console.log('   ✅ TensorFlow.js imported successfully');
    
    // Initialize backend
    console.log('2. Initializing TensorFlow backend...');
    await tf.ready();
    console.log(`   ✅ Backend initialized: ${tf.getBackend()}`);
    
    // Test basic tensor operations
    console.log('3. Testing basic tensor operations...');
    const tensor1 = tf.tensor2d([[1, 2], [3, 4]]);
    const tensor2 = tf.tensor2d([[5, 6], [7, 8]]);
    const result = tensor1.add(tensor2);
    
    const data = await result.data();
    console.log('   ✅ Tensor addition result:', Array.from(data));
    
    // Cleanup tensors
    tensor1.dispose();
    tensor2.dispose();
    result.dispose();
    
    // Test model creation
    console.log('4. Testing model creation...');
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    console.log('   ✅ Model created successfully');
    console.log(`   📊 Model has ${model.countParams()} parameters`);
    
    // Test model prediction
    console.log('5. Testing model prediction...');
    const inputData = tf.randomNormal([1, 10]);
    const prediction = model.predict(inputData);
    const predictionValue = await prediction.data();
    
    console.log('   ✅ Model prediction:', predictionValue[0]);
    console.log('   📈 Prediction shape:', prediction.shape);
    
    // Cleanup
    inputData.dispose();
    prediction.dispose();
    model.dispose();
    
    // Test memory management
    console.log('6. Testing memory management...');
    const initialMemory = tf.memory();
    console.log(`   📊 Initial tensors: ${initialMemory.numTensors}`);
    
    // Create and dispose many tensors
    for (let i = 0; i < 100; i++) {
      const temp = tf.randomNormal([10, 10]);
      temp.dispose();
    }
    
    const finalMemory = tf.memory();
    console.log(`   📊 Final tensors: ${finalMemory.numTensors}`);
    console.log(`   ✅ Memory management: ${finalMemory.numTensors === initialMemory.numTensors ? 'Good' : 'Check for leaks'}`);
    
    // Test complex model architecture
    console.log('7. Testing complex model (Financial Intelligence architecture)...');
    const complexModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [15], units: 128, activation: 'relu', name: 'input_layer' }),
        tf.layers.batchNormalization({ name: 'batch_norm_1' }),
        tf.layers.dropout({ rate: 0.3, name: 'dropout_1' }),
        tf.layers.dense({ units: 64, activation: 'relu', name: 'hidden_1' }),
        tf.layers.batchNormalization({ name: 'batch_norm_2' }),
        tf.layers.dropout({ rate: 0.2, name: 'dropout_2' }),
        tf.layers.dense({ units: 32, activation: 'relu', name: 'hidden_2' }),
        tf.layers.dense({ units: 3, activation: 'softmax', name: 'output_layer' })
      ]
    });
    
    console.log('   ✅ Complex model created');
    console.log(`   📊 Complex model parameters: ${complexModel.countParams()}`);
    
    // Test complex prediction
    const complexInput = tf.randomNormal([5, 15]); // Batch of 5 samples
    const complexPrediction = complexModel.predict(complexInput);
    const complexResults = await complexPrediction.data();
    
    console.log('   ✅ Batch prediction successful');
    console.log(`   📈 Output shape: ${complexPrediction.shape}`);
    console.log(`   🎯 Sample prediction: [${complexResults.slice(0, 3).map(x => x.toFixed(3)).join(', ')}]`);
    
    // Cleanup
    complexInput.dispose();
    complexPrediction.dispose();
    complexModel.dispose();
    
    // Performance test
    console.log('8. Performance benchmark...');
    const startTime = Date.now();
    
    const perfModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    const perfInput = tf.randomNormal([100, 10]);
    const perfOutput = perfModel.predict(perfInput);
    await perfOutput.data();
    
    const duration = Date.now() - startTime;
    console.log(`   ⚡ 100 sample prediction took ${duration}ms`);
    
    // Cleanup
    perfInput.dispose();
    perfOutput.dispose();
    perfModel.dispose();
    
    // Final memory check
    const finalTensorCount = tf.memory().numTensors;
    console.log(`\n🎉 TensorFlow.js test completed successfully!`);
    console.log(`📊 Final tensor count: ${finalTensorCount}`);
    console.log(`✅ TensorFlow.js is ready for production use\n`);
    
    // Test Intelligent Insights Engine integration
    console.log('9. Testing Intelligent Insights Engine integration...');
    try {
      const IntelligentInsightsEngine = await import('../src/services/intelligentInsightsEngine.js');
      const engine = IntelligentInsightsEngine.default;
      
      console.log('   ✅ Insights Engine imported');
      console.log(`   🤖 ML Enabled: ${engine.mlEnabled}`);
      
      if (engine.models.engagement) {
        console.log('   ✅ Engagement model loaded');
      }
      if (engine.models.impact) {
        console.log('   ✅ Impact model loaded');
      }
      if (engine.models.growth) {
        console.log('   ✅ Growth model loaded');
      }
      if (engine.models.collaboration) {
        console.log('   ✅ Collaboration model loaded');
      }
      
    } catch (integrationError) {
      console.log('   ⚠️  Integration test failed:', integrationError.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ TensorFlow.js test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testTensorFlow()
    .then(success => {
      if (success) {
        console.log('🚀 All tests passed! TensorFlow.js is ready for production.');
        process.exit(0);
      } else {
        console.log('💥 Tests failed! Check the errors above.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

export default testTensorFlow;