// Supabase/PostgREST silently caps unpaginated queries at 1000 rows. Once the
// app has more than ~1000 attendance rows total, plain `.select()` calls
// quietly drop the tail of the result set — which, sorted ascending by date,
// is exactly the most recent lessons. This walks pages until exhausted.
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  let rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) {
      console.error('fetchAllRows error:', error.message);
      break;
    }
    rows = rows.concat(data ?? []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}
