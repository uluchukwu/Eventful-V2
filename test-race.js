const EVENT_ID = "61e237dc-cf64-4625-81d1-1de53fa932ec";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiZTM1ZGM0YS1mY2NlLTQ4NjktODA5Mi1iZTdiYjk2ODUzMjAiLCJyb2xlIjoiRVZFTlRFRSIsImlhdCI6MTc4Njg0OTY2NiwiZXhwIjoxNzg3NDU0NDY2fQ.kjFmusLUpI5ryBAWqixyA3ZT9qM-V8b6gYq1J5HV7JU";

async function buyTicket() {
  const res = await fetch(`http://localhost:3000/events/${EVENT_ID}/tickets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  const data = await res.json();
  console.log(res.status, data);
}

Promise.all([buyTicket(), buyTicket(), buyTicket()]);