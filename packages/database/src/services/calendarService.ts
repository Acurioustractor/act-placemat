/**
 * Calendar Service
 * Community event management with Australian timezone support
 * Handles Beautiful Obsolescence community gatherings and skill-sharing sessions
 */

import type {
  CalendarEvent,
  EventAttendee,
  EventType,
  AttendeeStatus,
} from '../../generated/client';
import { getPrismaClient } from '../index';

export class CalendarService {
  private prisma = getPrismaClient();

  /**
   * Create a new community event
   */
  async createEvent(
    profileId: string,
    eventData: {
      title: string;
      description?: string;
      eventType: EventType;
      startTime: Date;
      endTime: Date;
      location?: string;
      onlineUrl?: string;
      maxAttendees?: number;
      skillsShared?: string[];
      communityBenefit?: boolean;
      beautifulObsolescenceAlignment?: number;
      requiresRSVP?: boolean;
      isPublic?: boolean;
      tags?: string[];
      cost?: number;
      currency?: string;
    }
  ): Promise<CalendarEvent> {
    return this.prisma.calendarEvent.create({
      data: {
        organizerProfileId: profileId,
        timezone: 'Australia/Sydney', // Default Australian timezone
        currency: eventData.currency || 'AUD',
        ...eventData,
      },
    });
  }

  /**
   * Get events for a specific date range
   */
  async getEventsInRange(
    startDate: Date,
    endDate: Date,
    filters?: {
      eventType?: EventType;
      location?: string;
      skillsShared?: string[];
      communityBenefit?: boolean;
      isPublic?: boolean;
    }
  ): Promise<CalendarEvent[]> {
    return this.prisma.calendarEvent.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        ...(filters?.eventType && { eventType: filters.eventType }),
        ...(filters?.location && {
          location: { contains: filters.location, mode: 'insensitive' },
        }),
        ...(filters?.communityBenefit !== undefined && {
          communityBenefit: filters.communityBenefit,
        }),
        ...(filters?.isPublic !== undefined && {
          isPublic: filters.isPublic,
        }),
        ...(filters?.skillsShared && {
          skillsShared: { hasSome: filters.skillsShared },
        }),
      },
      include: {
        organizer: {
          include: {
            user: {
              select: { name: true, location: true },
            },
          },
        },
        attendees: {
          include: {
            profile: {
              include: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Get events organized by a specific profile
   */
  async getEventsByOrganizer(
    organizerProfileId: string,
    includeUpcoming: boolean = true
  ): Promise<CalendarEvent[]> {
    const now = new Date();

    return this.prisma.calendarEvent.findMany({
      where: {
        organizerProfileId,
        ...(includeUpcoming && { startTime: { gte: now } }),
      },
      include: {
        attendees: {
          include: {
            profile: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Get events a profile is attending
   */
  async getEventsForAttendee(
    profileId: string,
    includeUpcoming: boolean = true
  ): Promise<
    (CalendarEvent & {
      attendeeStatus: AttendeeStatus;
      rsvpDate: Date;
    })[]
  > {
    const now = new Date();

    const attendeeRecords = await this.prisma.eventAttendee.findMany({
      where: {
        profileId,
        ...(includeUpcoming && {
          event: { startTime: { gte: now } },
        }),
      },
      include: {
        event: {
          include: {
            organizer: {
              include: {
                user: { select: { name: true, location: true } },
              },
            },
            attendees: {
              include: {
                profile: {
                  include: {
                    user: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { event: { startTime: 'asc' } },
    });

    return attendeeRecords.map(record => ({
      ...record.event,
      attendeeStatus: record.status,
      rsvpDate: record.rsvpDate,
    }));
  }

  /**
   * RSVP to an event
   */
  async rsvpToEvent(
    eventId: string,
    profileId: string,
    status: AttendeeStatus,
    notes?: string
  ): Promise<EventAttendee> {
    // Check if event exists and has capacity
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        attendees: {
          where: { status: { in: ['ATTENDING', 'MAYBE'] } },
        },
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (
      event.maxAttendees &&
      event.attendees.length >= event.maxAttendees &&
      status === 'ATTENDING'
    ) {
      throw new Error('Event is at capacity');
    }

    // Check if already RSVP'd
    const existingRsvp = await this.prisma.eventAttendee.findUnique({
      where: {
        eventId_profileId: {
          eventId,
          profileId,
        },
      },
    });

    if (existingRsvp) {
      // Update existing RSVP
      return this.prisma.eventAttendee.update({
        where: { id: existingRsvp.id },
        data: {
          status,
          notes,
          rsvpDate: new Date(),
        },
      });
    } else {
      // Create new RSVP
      return this.prisma.eventAttendee.create({
        data: {
          eventId,
          profileId,
          status,
          notes,
          rsvpDate: new Date(),
        },
      });
    }
  }

  /**
   * Cancel RSVP to an event
   */
  async cancelRsvp(eventId: string, profileId: string): Promise<void> {
    await this.prisma.eventAttendee.delete({
      where: {
        eventId_profileId: {
          eventId,
          profileId,
        },
      },
    });
  }

  /**
   * Update event details
   */
  async updateEvent(
    eventId: string,
    organizerProfileId: string,
    updates: Partial<
      Omit<CalendarEvent, 'id' | 'organizerProfileId' | 'createdAt' | 'updatedAt'>
    >
  ): Promise<CalendarEvent> {
    // Verify organizer permissions
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.organizerProfileId !== organizerProfileId) {
      throw new Error('Unauthorized to update this event');
    }

    return this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Cancel an event and notify attendees
   */
  async cancelEvent(eventId: string, organizerProfileId: string): Promise<void> {
    // Verify organizer permissions
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.organizerProfileId !== organizerProfileId) {
      throw new Error('Unauthorized to cancel this event');
    }

    await this.prisma.$transaction(async tx => {
      // Update all attendee statuses to cancelled
      await tx.eventAttendee.updateMany({
        where: { eventId },
        data: { status: 'NOT_ATTENDING' },
      });

      // Mark event as cancelled (soft delete)
      await tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          title: `[CANCELLED] ${event.title}`,
          description: `This event has been cancelled.\n\n${event.description || ''}`,
        },
      });
    });
  }

  /**
   * Get event attendee list with contact details
   */
  async getEventAttendees(
    eventId: string,
    organizerProfileId: string
  ): Promise<
    Array<{
      profile: { id: string; user: { name: string; email?: string } };
      status: AttendeeStatus;
      rsvpDate: Date;
      notes: string | null;
    }>
  > {
    // Verify organizer permissions
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.organizerProfileId !== organizerProfileId) {
      throw new Error('Unauthorized to view attendee list');
    }

    const attendees = await this.prisma.eventAttendee.findMany({
      where: { eventId },
      include: {
        profile: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // ATTENDING first
        { rsvpDate: 'asc' },
      ],
    });

    return attendees;
  }

  /**
   * Get upcoming community events promoting Beautiful Obsolescence
   */
  async getBeautifulObsolescenceEvents(
    minAlignment: number = 7.0,
    days: number = 30
  ): Promise<CalendarEvent[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.calendarEvent.findMany({
      where: {
        startTime: { gte: startDate, lte: endDate },
        beautifulObsolescenceAlignment: { gte: minAlignment },
        communityBenefit: true,
        isPublic: true,
      },
      include: {
        organizer: {
          include: {
            user: {
              select: { name: true, location: true },
            },
          },
        },
        attendees: {
          where: { status: 'ATTENDING' },
        },
      },
      orderBy: [{ beautifulObsolescenceAlignment: 'desc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Find skill-sharing events by expertise area
   */
  async getSkillSharingEvents(
    skills: string[],
    location?: string,
    days: number = 30
  ): Promise<CalendarEvent[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.calendarEvent.findMany({
      where: {
        startTime: { gte: startDate, lte: endDate },
        eventType: { in: ['WORKSHOP', 'SKILL_SHARE', 'MEETUP'] },
        skillsShared: { hasSome: skills },
        isPublic: true,
        ...(location && {
          location: { contains: location, mode: 'insensitive' },
        }),
      },
      include: {
        organizer: {
          include: {
            user: {
              select: { name: true, location: true },
            },
          },
        },
        attendees: {
          where: { status: 'ATTENDING' },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Get event analytics for organizer
   */
  async getEventAnalytics(
    organizerProfileId: string,
    months: number = 6
  ): Promise<{
    totalEventsOrganized: number;
    totalAttendees: number;
    avgAttendeesPerEvent: number;
    eventsByType: Array<{ eventType: EventType; count: number }>;
    attendanceRate: number; // RSVPs vs actual attendance
    beautifulObsolescenceImpact: number;
    skillsSharedCount: number;
  }> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const events = await this.prisma.calendarEvent.findMany({
      where: {
        organizerProfileId,
        createdAt: { gte: startDate },
      },
      include: {
        attendees: true,
      },
    });

    const totalEventsOrganized = events.length;
    const totalAttendees = events.reduce(
      (sum, event) => sum + event.attendees.filter(a => a.status === 'ATTENDED').length,
      0
    );
    const avgAttendeesPerEvent =
      totalEventsOrganized > 0 ? totalAttendees / totalEventsOrganized : 0;

    // Event type distribution
    const eventTypeCount = events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<EventType, number>
    );

    const eventsByType = Object.entries(eventTypeCount).map(([eventType, count]) => ({
      eventType: eventType as EventType,
      count,
    }));

    // Calculate attendance rate
    const totalRsvps = events.reduce(
      (sum, event) =>
        sum + event.attendees.filter(a => a.status === 'ATTENDING').length,
      0
    );
    const attendanceRate = totalRsvps > 0 ? (totalAttendees / totalRsvps) * 100 : 0;

    // Beautiful Obsolescence impact
    const alignmentEvents = events.filter(e => e.beautifulObsolescenceAlignment);
    const beautifulObsolescenceImpact =
      alignmentEvents.length > 0
        ? alignmentEvents.reduce(
            (sum, e) => sum + (e.beautifulObsolescenceAlignment || 0),
            0
          ) / alignmentEvents.length
        : 0;

    // Skills shared
    const allSkills = events.flatMap(e => e.skillsShared || []);
    const skillsSharedCount = new Set(allSkills).size;

    return {
      totalEventsOrganized,
      totalAttendees,
      avgAttendeesPerEvent,
      eventsByType,
      attendanceRate,
      beautifulObsolescenceImpact,
      skillsSharedCount,
    };
  }

  /**
   * Mark attendee as having attended the event
   */
  async markAttendance(
    eventId: string,
    profileId: string,
    organizerProfileId: string
  ): Promise<EventAttendee> {
    // Verify organizer permissions
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.organizerProfileId !== organizerProfileId) {
      throw new Error('Unauthorized to mark attendance');
    }

    return this.prisma.eventAttendee.update({
      where: {
        eventId_profileId: {
          eventId,
          profileId,
        },
      },
      data: {
        status: 'ATTENDED',
        attendanceMarkedAt: new Date(),
      },
    });
  }

  /**
   * Delete event permanently
   */
  async deleteEvent(eventId: string, organizerProfileId: string): Promise<void> {
    // Verify organizer permissions
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.organizerProfileId !== organizerProfileId) {
      throw new Error('Unauthorized to delete this event');
    }

    await this.prisma.$transaction(async tx => {
      // Delete all attendee records first
      await tx.eventAttendee.deleteMany({ where: { eventId } });

      // Delete the event
      await tx.calendarEvent.delete({ where: { id: eventId } });
    });
  }
}
