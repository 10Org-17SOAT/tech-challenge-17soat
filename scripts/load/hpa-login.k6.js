// Load that makes the HPA in k8s/base/api/hpa.yaml scale the API out.
//
// It hammers POST /auth/login because every call runs a bcrypt comparison, the
// most CPU-bound thing the API does, so CPU crosses the 70% target with a few
// dozen virtual users. Uses the admin from the demo seed, so it only works
// against the local overlay (RUN_SEED=true).
//
//   k6 run scripts/load/hpa-login.k6.js
//   k6 run -e BASE_URL=http://<ip>:30080 scripts/load/hpa-login.k6.js
//
// Watch it scale in another terminal:
//   kubectl get hpa api --watch
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:30080';

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '4m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // Scaling must not cost availability: new pods only take traffic once the
    // readiness probe passes.
    http_req_failed: ['rate<0.01'],
  },
};

const payload = JSON.stringify({
  email: 'admin@oficina.dev',
  password: 'Oficina@2026',
});

export default function () {
  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'status is 2xx': (r) => r.status >= 200 && r.status < 300 });
}
