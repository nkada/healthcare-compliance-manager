
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckCircle, Clock, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { FormViewer } from '@/components/FormViewer';
import type { Task, User, Form } from '../../../server/src/schema';

interface MyTasksProps {
  currentUser: User;
  onRefresh: () => Promise<void>;
}

export function MyTasks({ currentUser, onRefresh }: MyTasksProps) {
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isFormViewerOpen, setIsFormViewerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statusOptions = {
    pending: { label: '⏳ Pending', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: '🔄 In Progress', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '✅ Completed', color: 'bg-green-100 text-green-800' },
    overdue: { label: '⚠️ Overdue', color: 'bg-red-100 text-red-800' }
  };

  const loadUserTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const tasks = await trpc.getTasksByUser.query({ userId: currentUser.id });
      setUserTasks(tasks);
    } catch (error) {
      console.error('Failed to load user tasks:', error);
      // Provide fallback empty array for demonstration
      setUserTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadUserTasks();
  }, [loadUserTasks]);

  const handleStartTask = async (task: Task) => {
    try {
      // First update task status to in_progress
      await trpc.updateTaskStatus.mutate({
        id: task.id,
        status: 'in_progress'
      });
      
      // Then get the form details and open the form viewer
      const form = await trpc.getFormById.query({ id: task.form_id });
      setSelectedTask(task);
      setSelectedForm(form);
      setIsFormViewerOpen(true);
      
      // Refresh tasks
      await loadUserTasks();
    } catch (error) {
      console.error('Failed to start task:', error);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await trpc.updateTaskStatus.mutate({
        id: task.id,
        status: 'completed'
      });
      await loadUserTasks();
      await onRefresh(); // Refresh parent data
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const filteredTasks = statusFilter === 'all' 
    ? userTasks 
    : userTasks.filter((task: Task) => task.status === statusFilter);

  const getTaskPriority = (task: Task) => {
    const now = new Date();
    const dueDate = new Date(task.due_date);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (task.status === 'overdue') return 'high';
    if (hoursUntilDue < 24) return 'high';
    if (hoursUntilDue < 72) return 'medium';
    return 'low';
  };

  const formatTimeRemaining = (dueDate: Date) => {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Due soon';
  };

  // Task statistics
  const completedTasks = userTasks.filter(task => task.status === 'completed').length;
  const totalTasks = userTasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-slate-600">Loading your tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Tasks</h2>
          <p className="text-slate-600">Your assigned compliance tasks</p>
        </div>
        <Button variant="outline" onClick={loadUserTasks}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Task Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-slate-500">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <p className="text-xs text-slate-500">Tasks finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            {Object.entries(statusOptions).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300">
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {userTasks.length === 0 ? 'No Tasks Assigned' : 'No Tasks Match Filter'}
              </h3>
              <p className="text-slate-500">
                {userTasks.length === 0 
                  ? 'You don\'t have any compliance tasks assigned yet.'
                  : 'Try adjusting your filter to see more tasks.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task: Task) => {
            const priority = getTaskPriority(task);
            const timeRemaining = formatTimeRemaining(task.due_date);
            
            return (
              <Card key={task.id} className={`${
                priority === 'high' ? 'border-red-200 bg-red-50' :
                priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-slate-200'
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {task.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {timeRemaining}
                        </div>
                        <div>Due: {task.due_date.toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={statusOptions[task.status].color}>
                          {statusOptions[task.status].label}
                        </Badge>
                        {priority === 'high' && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            High Priority
                          </Badge>
                        )}
                        {task.recurrence_type !== 'none' && (
                          <Badge variant="outline">
                            🔄 {task.recurrence_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {task.status === 'pending' && (
                        <Button onClick={() => handleStartTask(task)}>
                          Start Task
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={() => handleStartTask(task)}
                          >
                            Continue
                          </Button>
                          <Button 
                            onClick={() => handleCompleteTask(task)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete
                          </Button>
                        </>
                      )}
                      {task.status === 'completed' && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          ✅ Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>

      {/* Form Viewer Dialog */}
      <Dialog open={isFormViewerOpen} onOpenChange={setIsFormViewerOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Task: {selectedTask?.title}</DialogTitle>
            <DialogDescription>
              Fill out the form below to complete this compliance task
            </DialogDescription>
          </DialogHeader>
          {selectedForm && selectedTask && (
            <FormViewer 
              form={selectedForm}
              task={selectedTask}
              onSubmit={async () => {
                setIsFormViewerOpen(false);
                await handleCompleteTask(selectedTask);
              }}
              onCancel={() => setIsFormViewerOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
