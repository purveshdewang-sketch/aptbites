// supportAI.js

export async function getCustomerAIResponse({
  question,
  orders,
  tickets,
  user,
}) {

  const q = question.toLowerCase();

  if (
    q.includes("track") ||
    q.includes("where is my order")
  ) {

    const latestOrder = orders?.[0];

    if (!latestOrder) {
      return "I couldn't find any recent orders.";
    }

    return `Your latest order #${latestOrder.id} is currently ${latestOrder.status}.`;
  }

  if (
    q.includes("refund")
  ) {
    return "I can help you create a refund request.";
  }

  return "Can you tell me more about the issue?";
}

export async function getSellerAIResponse({
  question,
  profile,
  foods,
  orders,
}) {

  const q = question.toLowerCase();

  if (
    q.includes("earn") ||
    q.includes("earning")
  ) {

    const completed =
      orders?.filter(
        (o) => o.status === "completed"
      ) || [];

    const earnings =
      completed.reduce(
        (sum, order) =>
          sum + Number(order.subtotal_amount || 0),
        0
      );

    return `You have earned ₹${earnings} from ${completed.length} completed orders.`;
  }

  if (
    q.includes("order")
  ) {

    return `You currently have ${orders?.length || 0} total orders.`;
  }

  return "Can you tell me more about what you need help with?";
}