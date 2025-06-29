
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Users, FileText, Calendar, BarChart3, Plus, Settings } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Form, Task, OrganizationAnalytics } from '../../server/src/schema';

// Import our feature components
import { UserManagement } from '@/components/UserManagement';
import { FormBuilder } from '@/components/FormBuilder';
import { TaskManagement } from '@/components/TaskManagement';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { MyTasks } from '@/components/MyTasks';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Memoized current user to prevent dependency changes
  const currentUser: User = useMemo(() => ({
    id: 1,
    email: 'admin@healthcare.com',
    password_hash: '',
    first_name: 'Healthcare',
    last_name: 'Administrator',
    role: 'admin',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }), []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load all data - using Promise.allSettled to handle stub responses gracefully
      const [usersResult, formsResult, tasksResult, analyticsResult] = await Promise.allSettled([
        trpc.getUsers.query(),
        trpc.getForms.query(),
        trpc.getAllTasks.query(),
        trpc.getOrganizationAnalytics.query({})
      ]);

      // Handle results, providing fallbacks for stub responses
      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value.length > 0 ? usersResult.value : [currentUser]);
      } else {
        // Stub fallback - show current user
        setUsers([currentUser]);
      }

      if (formsResult.status === 'fulfilled') {
        setForms(formsResult.value);
      }

      if (tasksResult.status === 'fulfilled') {
        setTasks(tasksResult.value);
      }

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
      // Provide fallback data for demonstration
      setUsers([currentUser]);
      setForms([]);
      setTasks([]);
      setAnalytics({
        total_forms: 0,
        total_tasks: 0,
        completed_tasks: 0,
        overdue_tasks: 0,
        overall_completion_rate: 0,
        active_users: 1
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick stats for dashboard
  const overdueTasks = tasks.filter(task => task.status === 'overdue').length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const activeForms = forms.filter(form => form.is_active).length;
  const activeUsers = users.filter(user => user.is_active).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading compliance dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">ComplianceHub</h1>
                <p className="text-sm text-slate-500">Healthcare Compliance Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                {currentUser.role === 'admin' ? '👨‍💼 Administrator' : '👤 Standard User'}
              </Badge>
              <span className="text-sm text-slate-600">
                {currentUser.first_name} {currentUser.last_name}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-fit lg:grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="my-tasks" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              My Tasks
            </TabsTrigger>
            {currentUser.role === 'admin' && (
              <>
                <TabsTrigger value="forms" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Forms
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Task Mgmt
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Dashboard Overview */}
          <TabsContent value="dashboard" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Compliance Overview</h2>
              <p className="text-slate-600">Monitor your organization's compliance status and recent activity.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Forms</CardTitle>
                  <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeForms}</div>
                  <p className="text-xs text-slate-500">
                    Compliance forms available
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <Calendar className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tasks.length}</div>
                  <p className="text-xs text-slate-500">
                    {completedTasks} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
                  <p className="text-xs text-slate-500">
                    Require immediate attention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeUsers}</div>
                  <p className="text-xs text-slate-500">
                    Team members
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Completion Rate */}
            {tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Overall Completion Rate</CardTitle>
                  <CardDescription>
                    Current compliance task completion across all forms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Completed: {completedTasks}</span>
                      <span>Total: {tasks.length}</span>
                    </div>
                    <Progress 
                      value={tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0} 
                      className="w-full" 
                    />
                    <p className="text-xs text-slate-500">
                      {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}% completion rate
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Getting Started */}
            {forms.length === 0 && currentUser.role === 'admin' && (
              <Card className="border-dashed border-2 border-slate-300">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Plus className="h-5 w-5" />
                    Get Started with ComplianceHub
                  </CardTitle>
                  <CardDescription>
                    Create your first compliance form to begin managing your organization's requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button onClick={() => setActiveTab('forms')} size="lg">
                    Create Your First Form
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Tasks - Available to all users */}
          <TabsContent value="my-tasks">
            <MyTasks currentUser={currentUser} onRefresh={loadData} />
          </TabsContent>

          {/* Admin-only tabs */}
          {currentUser.role === 'admin' && (
            <>
              <TabsContent value="forms">
                <FormBuilder 
                  forms={forms} 
                  onRefresh={loadData}
                />
              </TabsContent>

              <TabsContent value="tasks">
                <TaskManagement 
                  tasks={tasks}
                  users={users}
                  forms={forms}
                  onRefresh={loadData}
                />
              </TabsContent>

              <TabsContent value="users">
                <UserManagement 
                  users={users}
                  onRefresh={loadData}
                />
              </TabsContent>

              <TabsContent value="analytics">
                <AnalyticsDashboard 
                  analytics={analytics}
                  forms={forms}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;
