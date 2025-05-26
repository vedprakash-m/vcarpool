// This file is required for static export with dynamic routes
export async function generateStaticParams() {
  // In a real app, you might want to fetch the list of trip IDs here
  // For now, we'll return an empty array and let client-side navigation handle it
  return [];
}

export default generateStaticParams;
