import React from 'react';
import Modal from '../../components/common/Modal';
import RecordExpenseForm from './RecordExpense';
import Btn from '../../components/common/Button';
import Table from '../../components/common/Table'; // Your custom component
import { useGetExpensesQuery } from '../../store/api/reportApi';
import { useAuth } from '../../hooks';
import { Edit, Trash2, Eye } from 'lucide-react'; // For action icons
import { useTranslation } from 'react-i18next';

const HouseOwnerExpensesPage = () => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const { user } = useAuth();
    const {t} = useTranslation();
    const { data, isLoading, isError, refetch } = useGetExpensesQuery(
        { houseOwnerId: user?.id },
        { skip: !user?.id }
    );

    

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    // Handler functions for actions
    const handleEdit = (expense) => {
        console.log("Edit expense:", expense.id);
        // Add your edit logic here (e.g., set selectedExpense and open modal)
    };

    const handleDelete = (expense) => {
        if (window.confirm("Are you sure you want to delete this record?")) {
            console.log("Delete expense:", expense.id);
        }
    };

    // Table Columns Definition
    const columns = [
        {
            title: t('date'),
            dataIndex: 'expense_date',
            render: (row) => new Date(row.expense_date).toLocaleDateString(),
        },
        {
            title: t('amount'),
            dataIndex: 'amount',
            className: 'text-right',
            cellClassName: 'text-right font-bold',
            render: (row) => `৳${parseFloat(row.amount).toLocaleString()}`, // Using Taka as example
        },
        {
            title: t('category'),
            dataIndex: 'category',
            render: (row) => (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                    {row.category}
                </span>
            ),
        },
        {
            title: t('description'),
            dataIndex: 'description',
            render: (row) => <span className="text-gray-600 truncate max-w-[200px] block">{row.description || '-'}</span>,
        },
        {
            title: t('payment_method'),
            dataIndex: 'payment_method',
            cellClassName: 'capitalize',
        },
        
        {
            title: t('actions'),
            key: 'actions',
            className: 'text-center',
            render: (row) => (
                <div className="flex justify-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => handleEdit(row)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t('edit')}
                    >
                        <Edit size={18} />
                    </button>
                    <button 
                        onClick={() => handleDelete(row)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={t('delete')}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ];

    const expenses = data?.data || [];
    const summary = data?.summary || { totalCount: 0, totalAmount: 0 };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Expenses Analysis</h1>
                    <p className="text-sm text-gray-500">Track and manage your property expenditures</p>
                </div>
                <Btn onClick={openModal} className="flex items-center gap-2">
                    <span>+ {t('record_expense')}</span>
                </Btn>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">{t('total_records')}</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalCount}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">{t('monthly_spend')}</p>
                    <p className="text-2xl font-bold text-primary">
                        ৳{parseFloat(summary.totalAmount).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Main Table Component */}
            <Table 
                columns={columns} 
                data={expenses} 
                loading={isLoading}
                hoverable={true}
                striped={false}
                className="bg-white"
                emptyMessage={t('no_expense_records_found')}
            />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={t('record_expense')}>
                <RecordExpenseForm 
                    onSuccess={() => {
                        closeModal();
                        refetch();
                    }} 
                />
            </Modal>
        </div>
    );
};

export default HouseOwnerExpensesPage;