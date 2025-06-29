
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, FileText, Calendar, Filter, RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { OrganizationAnalytics, FormAnalytics, Form, AnalyticsFilter } from '../../../server/src/schema';

interface AnalyticsDashboardProps {
  analytics: OrganizationAnalytics | null;
  forms: Form[];
}

export function AnalyticsDashboard({ analytics, forms }: AnalyticsDashboardProps) {
  const [formAnalytics, setFormAnalytics] = useState<FormAnalytics[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] =  useState<AnalyticsFilter>({
    tags: undefined,
    date_from: undefined,
    date_to: undefined,
    user_id: undefined
  });

  const loadFormAnalytics = useCallback(async () => {
    if (!selectedFormId) return;
    
    setIsLoading(true);
    try {
      const result = await trpc.getFormAnalytics.query({
        formId: selectedFormId,
        filter: filters
      });
      setFormAnalytics([result]);
    } catch (error) {
      console.error('Failed to load form analytics:', error);
      // Stub data for demonstration
      const form = forms.find(f => f.id === selectedFormId);
      if (form) {
        setFormAnalytics([{
          form_id: form.id,
          form_title: form.title,
          total_submissions: 0,
          completion_rate: 0,
          average_completion_time: null,
          tags: form.tags ? JSON.parse(form.tags) : []
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedFormId, filters, forms]);

  useEffect(() => {
    if (selectedFormId) {
      loadFormAnalytics();
    }
  }, [loadFormAnalytics, selectedFormId]);

  const handleFilterChange = (key: keyof AnalyticsFilter, value: string | number | Date | string[] | undefined) => {
    setFilters((prev: AnalyticsFilter) => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({
      tags: undefined,
      date_from: undefined,
      date_to: undefined,
      user_id: undefined
    });
  };

  // Get unique tags from all forms
  const allTags = Array.from(new Set(
    forms.flatMap((form: Form) => 
      form.tags ? JSON.parse(form.tags) : []
    )
  ));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
          <p className="text-slate-600">Monitor compliance performance and trends</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organization">Organization Overview</TabsTrigger>
          <TabsTrigger value="forms">Form Analytics</TabsTrigger>
        </TabsList>

        {/* Organization Analytics */}
        <TabsContent value="organization" className="space-y-6">
          {analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
                    <FileText className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.total_forms}</div>
                    <p className="text-xs text-slate-500">Active compliance forms</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                    <Calendar className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.total_tasks}</div>
                    <p className="text-xs text-slate-500">
                      {analytics.completed_tasks} completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{analytics.overdue_tasks}</div>
                    <p className="text-xs text-slate-500">Need immediate attention</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Users className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.active_users}</div>
                    <p className="text-xs text-slate-500">Team members</p>
                  </CardContent>
                </Card>
              </div>

              {/* Completion Rate */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Completion Rate</CardTitle>
                  <CardDescription>
                    Organization-wide task completion performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Completion Rate: {Math.round(analytics.overall_completion_rate)}%
                      </span>
                      <span className="text-sm text-slate-500">
                        {analytics.completed_tasks} of {analytics.total_tasks} tasks
                      </span>
                    </div>
                    <Progress value={analytics.overall_completion_rate} className="w-full" />
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.completed_tasks}
                        </div>
                        <div className="text-sm text-slate-500">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {analytics.overdue_tasks}
                        </div>
                        <div className="text-sm text-slate-500">Overdue</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                  <CardDescription>
                    Key observations about your compliance management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.overall_completion_rate >= 80 ? (
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-green-600">✅</div>
                        <span className="text-green-800">
                          Excellent compliance performance! Keep up the great work.
                        </span>
                      </div>
                    ) : analytics.overall_completion_rate >= 60 ? (
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-yellow-600">⚠️</div>
                        <span className="text-yellow-800">
                          Good progress, but there's room for improvement in task completion.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-red-600">🚨</div>
                        <span className="text-red-800">
                          Low completion rate detected. Consider reviewing task assignments and deadlines.
                        </span>
                      </div>
                    )}

                    {analytics.overdue_tasks > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-red-600">⏰</div>
                        <span className="text-red-800">
                          {analytics.overdue_tasks} task{analytics.overdue_tasks > 1 ? 's are' : ' is'} overdue and require immediate attention.
                        </span>
                      </div>
                    )}

                    {analytics.total_forms === 0 && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-blue-600">💡</div>
                        <span className="text-blue-800">
                          Get started by creating your first compliance form to begin tracking requirements.
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No Analytics Data</h3>
                <p className="text-slate-500">
                  Analytics data will appear here once you have forms and tasks.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Form Analytics */}
        <TabsContent value="forms" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Analytics Filters
              </CardTitle>
              <CardDescription>
                Filter analytics data by date range, tags, or specific criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="form_select">Select Form</Label>
                  <Select
                    value={selectedFormId?.toString() || 'none'}
                    onValueChange={(value: string) => 
                      setSelectedFormId(value !== 'none' ? parseInt(value) : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a form" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a form</SelectItem>
                      {forms.map((form: Form) => (
                        <SelectItem key={form.id} value={form.id.toString()}>
                          {form.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_from">From Date</Label>
                  <Input
                    id="date_from"
                    type="date"
                    value={filters.date_from?.toISOString().split('T')[0] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleFilterChange('date_from', e.target.value ? new Date(e.target.value) : undefined)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_to">To Date</Label>
                  <Input
                    id="date_to"
                    type="date"
                    value={filters.date_to?.toISOString().split('T')[0] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleFilterChange('date_to', e.target.value ? new Date(e.target.value) : undefined)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Filter by Tag</Label>
                  <Select
                    value={filters.tags?.[0] || 'all-tags'}
                    onValueChange={(value: string) =>
                      handleFilterChange('tags', value !== 'all-tags' ? [value] : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-tags">All Tags</SelectItem>
                      {allTags.map((tag: string) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={isLoading}
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={loadFormAnalytics}
                  disabled={!selectedFormId || isLoading}
                >
                  {isLoading ? 'Loading...' : 'Apply Filters'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Form Analytics Results */}
          {selectedFormId ? (
            formAnalytics.length > 0 ? (
              <div className="space-y-6">
                {formAnalytics.map((analytics: FormAnalytics) => (
                  <Card key={analytics.form_id}>
                    <CardHeader>
                      <CardTitle>{analytics.form_title}</CardTitle>
                      <CardDescription>
                        Form performance metrics and insights
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-600">
                            Total Submissions
                          </Label>
                          <div className="text-2xl font-bold">
                            {analytics.total_submissions}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-600">
                            Completion Rate
                          </Label>
                          <div className="text-2xl font-bold">
                            {Math.round(analytics.completion_rate)}%
                          </div>
                          <Progress value={analytics.completion_rate} className="w-full" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-600">
                            Avg. Completion Time
                          </Label>
                          <div className="text-2xl font-bold">
                            {analytics.average_completion_time 
                              ? `${Math.round(analytics.average_completion_time)}min`
                              : 'N/A'
                            }
                          </div>
                        </div>
                      </div>

                      {analytics.tags.length > 0 && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium text-slate-600 mb-2 block">
                            Tags
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {analytics.tags.map((tag: string) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Data Available</h3>
                  <p className="text-slate-500">
                    No analytics data available for the selected form and filters.
                  </p>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a Form</h3>
                <p className="text-slate-500">
                  Choose a form from the filters above to view its analytics.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
