/**
 * Debug component to test API connectivity
 */

import React, { useEffect, useState } from 'react';
import projectService from '../services/projectService';

const TestAPI: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('🔍 Testing API connection...');
        const projects = await projectService.getAllProjects();
        console.log('✅ API Response:', projects);
        setData(projects);
      } catch (err) {
        console.error('❌ API Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  if (loading) {
    return <div>Testing API...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', border: '2px solid red' }}>
        <h2>API Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '2px solid green' }}>
      <h2>API Test Success</h2>
      <p>Found {data?.length || 0} projects</p>
      {data?.slice(0, 3).map((project: any) => (
        <div key={project.id} style={{ margin: '10px', padding: '10px', border: '1px solid blue' }}>
          <h3>{project.title}</h3>
          <p>{project.description}</p>
        </div>
      ))}
    </div>
  );
};

export default TestAPI;