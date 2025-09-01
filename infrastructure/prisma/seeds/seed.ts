import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting ACT Placemat database seeding...')

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@actplacemat.org.au' },
    update: {},
    create: {
      email: 'admin@actplacemat.org.au',
      name: 'ACT Admin',
      role: 'ADMIN',
      bio: 'System administrator for ACT Placemat platform',
      location: 'Australia',
      skills: ['Platform Management', 'Community Building', 'Systems Administration'],
      interests: ['Community Technology', 'Social Impact', 'Open Source'],
    },
  })

  console.log('✅ Created admin user:', adminUser.email)

  // Create sample community member
  const communityMember = await prisma.user.upsert({
    where: { email: 'member@actplacemat.org.au' },
    update: {},
    create: {
      email: 'member@actplacemat.org.au',
      name: 'Community Member',
      role: 'MEMBER',
      bio: 'Active community member passionate about social change',
      location: 'Sydney, NSW',
      skills: ['Community Engagement', 'Project Management', 'Social Media'],
      interests: ['Sustainability', 'Community Gardens', 'Education'],
    },
  })

  console.log('✅ Created community member:', communityMember.email)

  // Create sample project
  const sampleProject = await prisma.project.upsert({
    where: { id: 'sample-project-id' },
    update: {},
    create: {
      id: 'sample-project-id',
      title: 'ACT Community Garden Network',
      description: 'Building a network of community gardens across Australia to promote sustainable living and community connection.',
      content: `
# ACT Community Garden Network

## Vision
To create a thriving network of community gardens that brings people together, promotes sustainable living, and strengthens local communities across Australia.

## Objectives
- Establish community gardens in underutilised urban spaces
- Provide education and resources for sustainable gardening practices
- Foster community connections and social cohesion
- Promote food security and healthy eating habits
- Create green spaces that enhance urban environments

## Current Status
We are actively developing community gardens in Sydney, Melbourne, and Brisbane, with plans to expand to other major cities.

## Get Involved
Join us in growing stronger communities through shared gardening spaces!
      `,
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      category: 'Environment',
      tags: ['sustainability', 'community', 'gardening', 'environment', 'food-security'],
      location: 'Multiple Cities, Australia',
      region: 'National',
      coordinates: { lat: -33.8688, lng: 151.2093 }, // Sydney coordinates as example
      members: {
        create: [
          {
            userId: adminUser.id,
            role: 'OWNER',
          },
          {
            userId: communityMember.id,
            role: 'CONTRIBUTOR',
          },
        ],
      },
    },
  })

  console.log('✅ Created sample project:', sampleProject.title)

  // Create sample story
  const sampleStory = await prisma.story.upsert({
    where: { slug: 'community-garden-success-story' },
    update: {},
    create: {
      title: 'How Our Community Garden Transformed a Neighbourhood',
      content: `
# From Empty Lot to Thriving Community Hub

What started as an abandoned lot in Newtown has become the heart of our neighbourhood. Over 18 months, residents have come together to create something truly special - a community garden that feeds both body and soul.

## The Beginning

In early 2023, local resident Sarah noticed the empty lot on King Street had been unused for years. Rather than let it remain an eyesore, she reached out to the local council with a proposal: transform the space into a community garden.

## Building Together

The response was overwhelming. Within weeks, over 50 residents had volunteered to help. We organised working bees, shared tools and knowledge, and slowly but surely, the garden began to take shape.

### Key Milestones
- **March 2023**: Council approval received
- **April 2023**: First community working bee
- **June 2023**: First plants in the ground
- **August 2023**: First harvest celebration
- **October 2023**: Educational workshop program launched

## The Impact

Today, the garden produces over 200kg of fresh vegetables each month, distributed among participating families. More importantly, it's created connections that extend far beyond gardening.

"I've lived in this area for 10 years, but I never really knew my neighbours until we started working in the garden together," says Maria, one of the founding members.

## Looking Forward

Our success has inspired similar projects in three other suburbs, and we're now mentoring new communities through their own garden establishment process.

The power of community, combined with a shared purpose, can truly transform not just empty spaces, but the social fabric of entire neighbourhoods.
      `,
      excerpt: 'Discover how an abandoned lot became a thriving community garden that transformed an entire neighbourhood in Sydney.',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      category: 'Success Story',
      tags: ['community-garden', 'sustainability', 'neighbourhood', 'success-story', 'sydney'],
      slug: 'community-garden-success-story',
      metaTitle: 'Community Garden Success Story - ACT Placemat',
      metaDescription: 'Read how residents in Newtown transformed an abandoned lot into a thriving community garden that brings the neighbourhood together.',
      viewCount: 156,
      shareCount: 23,
      authorId: communityMember.id,
      projectId: sampleProject.id,
      publishedAt: new Date('2024-03-15'),
    },
  })

  console.log('✅ Created sample story:', sampleStory.title)

  // Create sample opportunity
  const sampleOpportunity = await prisma.opportunity.upsert({
    where: { id: 'volunteer-garden-coordinator' },
    update: {},
    create: {
      id: 'volunteer-garden-coordinator',
      title: 'Garden Coordinator Volunteer Needed',
      description: 'Help coordinate activities and events for our thriving community garden network.',
      content: `
# Garden Coordinator Volunteer Role

## About the Role
We're looking for an enthusiastic volunteer to help coordinate activities across our growing network of community gardens.

## Responsibilities
- Organise monthly community working bees
- Coordinate educational workshops and events
- Maintain communication with garden members
- Assist with new garden establishment
- Help with social media and community outreach

## What We're Looking For
- Passion for community building and sustainability
- Good communication and organisational skills  
- Available for 4-6 hours per week (flexible timing)
- Experience with gardening or community projects (preferred but not required)

## What You'll Gain
- Make a real impact in your community
- Develop leadership and project management skills
- Connect with like-minded community members
- Learn about sustainable gardening practices
- References and skill development opportunities

## Time Commitment
4-6 hours per week, with flexibility around your schedule. Peak times are weekends and early evenings.
      `,
      type: 'VOLUNTEER',
      status: 'OPEN',
      category: 'Community Coordination',
      tags: ['volunteer', 'coordination', 'community', 'gardening', 'sustainability'],
      skills: ['Communication', 'Organisation', 'Event Planning', 'Social Media'],
      timeCommitment: '4-6 hours per week',
      location: 'Sydney, NSW',
      remote: false,
      isPaid: false,
      deadline: new Date('2024-12-31'),
      startDate: new Date('2024-04-01'),
      duration: 'Ongoing',
      projectId: sampleProject.id,
      contactEmail: 'volunteer@actplacemat.org.au',
    },
  })

  console.log('✅ Created sample opportunity:', sampleOpportunity.title)

  // Create system settings
  await prisma.setting.upsert({
    where: { id: 'site_config' },
    update: {},
    create: {
      id: 'site_config',
      value: {
        siteName: 'ACT Placemat',
        siteDescription: 'Community-owned storytelling and project showcase platform',
        contactEmail: 'hello@actplacemat.org.au',
        socialLinks: {
          facebook: 'https://facebook.com/actplacemat',
          twitter: 'https://twitter.com/actplacemat',
          instagram: 'https://instagram.com/actplacemat',
          linkedin: 'https://linkedin.com/company/actplacemat',
        },
        features: {
          userRegistration: true,
          projectSubmission: true,
          storySubmission: true,
          commenting: true,
          opportunityPosting: true,
        },
      },
    },
  })

  console.log('✅ Created system settings')

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })