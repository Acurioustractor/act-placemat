/**
 * Create Community Data Transfer Objects
 *
 * Defines the input and output contracts for the Create Community use case.
 */

import { Command } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

// Input command for creating a community
export interface CreateCommunityCommand extends Command {
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  foundedDate: Date;
  createdBy?: string; // User ID of the creator
}

// Factory function for creating the command
export const createCommunityCommand = (params: {
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  foundedDate: Date;
  createdBy?: string;
}): CreateCommunityCommand => ({
  commandId: uuidv4(),
  timestamp: new Date(),
  ...params,
});

// Response after successful community creation
export interface CreateCommunityResponse {
  communityId: string;
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  foundedDate: Date;
  createdAt: Date;
}
