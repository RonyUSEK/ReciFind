import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from '../components/Common/DataTable';

describe('DataTable pagination', () => {
  test('Next shows the next page of rows', async () => {
    const user = userEvent.setup();

    const data = Array.from({ length: 11 }, (_, i) => ({
      id: i + 1,
      name: `Row ${i + 1}`,
    }));

    const columns = [
      { header: 'ID', accessorKey: 'id' },
      { header: 'Name', accessorKey: 'name' },
    ];

    render(
      <DataTable
        title="Test"
        data={data}
        columns={columns}
        initialPageSize={10}
        searchPlaceholder="Search"
      />
    );

    // Page 1 should show Row 1 but not Row 11
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.queryByText('Row 11')).not.toBeInTheDocument();

    // Move to page 2
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Page 2 should now show Row 11
    expect(await screen.findByText('Row 11')).toBeInTheDocument();
  });
});
