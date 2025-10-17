import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface BudgetAllocation {
    clothing: number;
    accessories: number;
    footwear: number;
    other: number;
}

interface BudgetPlan {
    totalBudget: number;
    allocations: BudgetAllocation;
    spending: BudgetAllocation;
}

const BudgetPlanning = () => {
    const { user, updateProfile } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [budget, setBudget] = useState<BudgetPlan>(() => ({
        totalBudget: 0,
        allocations: {
            clothing: 0,
            accessories: 0,
            footwear: 0,
            other: 0
        },
        spending: {
            clothing: 0,
            accessories: 0,
            footwear: 0,
            other: 0
        }
    }));

    useEffect(() => {
        const loadBudgetData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`http://localhost:5000/api/auth/get-budget/${user?.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load budget data');
                }

                const data = await response.json();
                if (data.budgetPlan) {
                    setBudget({
                        totalBudget: data.budgetPlan.totalBudget || 0,
                        allocations: {
                            clothing: data.budgetPlan.allocations?.clothing || 0,
                            accessories: data.budgetPlan.allocations?.accessories || 0,
                            footwear: data.budgetPlan.allocations?.footwear || 0,
                            other: data.budgetPlan.allocations?.other || 0
                        },
                        spending: {
                            clothing: data.budgetPlan.spending?.clothing || 0,
                            accessories: data.budgetPlan.spending?.accessories || 0,
                            footwear: data.budgetPlan.spending?.footwear || 0,
                            other: data.budgetPlan.spending?.other || 0
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading budget data:', error);
                toast({
                    title: "Error",
                    description: "Failed to load budget data",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (user?.id) {
            loadBudgetData();
        }
    }, [user?.id]);

    const handleTotalBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Math.max(0, parseFloat(e.target.value) || 0);
        setBudget(prev => ({
            ...prev,
            totalBudget: value
        }));
    };



    const handleSaveBudget = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/update-budget', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: user?.id,
                    budgetPlan: {
                        totalBudget: budget.totalBudget,
                        allocations: budget.allocations,
                        spending: budget.spending
                    }
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to save budget plan');
            }

            await updateProfile(data.user);
            
            toast({
                title: "Success",
                description: "Budget plan saved successfully",
            });
        } catch (error) {
            console.error('Failed to save budget plan:', error);
            toast({
                title: "Error",
                description: "Failed to save budget plan",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const totalSpending = Object.values(budget.spending).reduce((a, b) => a + b, 0);
    const remainingBudget = budget.totalBudget - totalSpending;

    const getCategoryProgressColor = (spent: number, totalBudget: number) => {
        if (totalBudget === 0) return 'bg-gray-300';
        const percentage = (spent / totalBudget) * 100;
        if (percentage >= 50) return 'bg-red-500';
        if (percentage >= 30) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Budget Planning</CardTitle>
                <CardDescription>
                    Manage your shopping budget and track spending across categories
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <span>Loading budget data...</span>
                    </div>
                ) : (
                    <>
                        {/* Total Budget Section */}
                        <div className="space-y-2">
                            <Label htmlFor="totalBudget">Total Budget (₹)</Label>
                            <Input
                                id="totalBudget"
                                type="number"
                                value={budget.totalBudget}
                                onChange={handleTotalBudgetChange}
                                min="0"
                                step="100"
                                placeholder="Enter your total budget"
                            />
                        </div>

                        {budget.totalBudget > 0 && (
                            <>
                                {/* Spending Tracking Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Spending by Category</h3>
                                    {Object.entries(budget.spending).map(([category, spent]) => {
                                        const percentage = budget.totalBudget > 0 ? (spent / budget.totalBudget) * 100 : 0;
                                        
                                        return (
                                            <div key={category} className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <Label className="font-medium">
                                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                                    </Label>
                                                    <div className="text-sm text-gray-600">
                                                        ₹{spent}
                                                        {budget.totalBudget > 0 && (
                                                            <span className={`ml-2 ${percentage >= 50 ? 'text-red-500' : percentage >= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                                ({percentage.toFixed(1)}% of total)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-300 ${getCategoryProgressColor(spent, budget.totalBudget)}`}
                                                        style={{
                                                            width: budget.totalBudget > 0 ? `${(spent / budget.totalBudget) * 100}%` : '0%'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Summary Section */}
                                <div className="pt-4 border-t space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <div className="text-sm text-blue-600 font-medium">Total Budget</div>
                                            <div className="text-xl font-bold text-blue-800">₹{budget.totalBudget}</div>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded-lg">
                                            <div className="text-sm text-purple-600 font-medium">Total Spent</div>
                                            <div className="text-xl font-bold text-purple-800">₹{totalSpending}</div>
                                        </div>
                                    </div>
                                    
                                    <div className={`p-3 rounded-lg ${remainingBudget >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                        <div className={`text-sm font-medium ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {remainingBudget >= 0 ? 'Remaining Budget' : 'Over Budget'}
                                        </div>
                                        <div className={`text-xl font-bold ${remainingBudget >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                            ₹{Math.abs(remainingBudget)}
                                        </div>
                                    </div>

                                    {/* Overall Budget Progress */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Budget Usage</span>
                                            <span>{((totalSpending / budget.totalBudget) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    totalSpending >= budget.totalBudget 
                                                        ? 'bg-red-500' 
                                                        : totalSpending >= budget.totalBudget * 0.8 
                                                        ? 'bg-yellow-500' 
                                                        : 'bg-green-500'
                                                }`}
                                                style={{
                                                    width: `${Math.min((totalSpending / budget.totalBudget) * 100, 100)}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    className="w-full" 
                                    onClick={handleSaveBudget}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Save Budget Plan'}
                                </Button>
                            </>
                        )}

                        {budget.totalBudget === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p>Set your total budget to start tracking your spending across categories.</p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default BudgetPlanning;