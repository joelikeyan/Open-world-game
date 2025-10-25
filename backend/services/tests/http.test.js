import request from 'supertest';

let createApp;
let closePool;

beforeAll(async () => {
  ({ createApp } = await import('../src/index.js'));
  ({ closePool } = await import('../src/db.js'));
  app = createApp();
});

let app;

afterAll(async () => {
  await closePool();
});

describe('Authoritative state HTTP API', () => {
  test('creates and retrieves player profile', async () => {
    const profile = {
      playerId: '11111111-1111-1111-1111-111111111111',
      displayName: 'Test Pilot',
      avatarUrl: 'https://example.com/avatar.png'
    };

    const createResponse = await request(app)
      .post('/players')
      .send(profile)
      .expect(201);

    expect(createResponse.body.display_name).toBe(profile.displayName);

    const getResponse = await request(app)
      .get(`/players/${profile.playerId}`)
      .expect(200);

    expect(getResponse.body.display_name).toBe(profile.displayName);
  });

  test('creates session, saves position, and loads it', async () => {
    const profile = {
      playerId: '22222222-2222-2222-2222-222222222222',
      displayName: 'Scout',
      avatarUrl: null
    };

    await request(app).post('/players').send(profile).expect(201);

    const sessionResponse = await request(app)
      .post('/sessions')
      .send({ ...profile, metadata: { shard: 'alpha' } })
      .expect(201);

    const sessionId = sessionResponse.body.id;

    const positionPayload = {
      sessionId,
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 180, z: 0 },
      velocity: { x: 0, y: 0, z: 1 }
    };

    await request(app)
      .post(`/players/${profile.playerId}/position`)
      .send(positionPayload)
      .expect(201);

    const positionResponse = await request(app)
      .get(`/players/${profile.playerId}/position`)
      .expect(200);

    expect(positionResponse.body.position).toEqual(positionPayload.position);
  });
});
