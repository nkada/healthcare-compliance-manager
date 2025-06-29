
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Plus, Clock, RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Task, User, Form, CreateTaskInput, UpdateTaskStatusInput } from '../../../server/src/schema';

interface TaskManagementProps {
  tasks: Task[];
  users: User[];
  forms: Form[];
  onRefresh: () => Promise<void>;
}

export function TaskManagement({ tasks, users, forms, onRefresh }: TaskManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [createFormData, setCreateFormData] = useState<CreateTaskInput>({
    form_id: 0,
    assigned_to: 0,
    title: '',
    due_date: new Date(),
    recurrence_type: 'none',
    recurrence_interval: null
  });

  const statusOptions = {
    pending: { label: '⏳ Pending', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: '🔄 In Progress', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '✅ Completed', color: 'bg-green-100 text-green-800' },
    overdue: { label: '⚠️ Overdue', color: 'bg-red-100 text-red-800' }
  };

  const recurrenceOptions = {
    none: 'No Recurrence',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly'
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createTask.mutate(createFormData);
      setCreateFormData({
        form_id: 0,
        assigned_to: 0,
        title: '',
        due_date: new Date(),
        recurrence_type: 'none',
        recurrence_interval: null
      });
      setIsCreateDialogOpen(false);
      await onRefresh();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: Task['status']) => {
    setIsLoading(true);
    try {
      const updateInput: UpdateTaskStatusInput = {
        id: taskId,
        status: newStatus
      };
      await trpc.updateTaskStatus.mutate(updateInput);
      await onRefresh();
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserName = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
  };

  const getFormTitle = (formId: number) => {
    const form = forms.find((f: Form) => f.id === formId);
    return form ? form.title : 'Unknown Form';
  };

  const filteredTasks = statusFilter === 'all' 
    ? tasks 
    : tasks.filter((task: Task) => task.status === statusFilter);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Task Management</h2>
          <p className="text-slate-600">Assign and track compliance tasks</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Assign a compliance form as a task to a team member
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form_id">Form</Label>
                <Select
                  value={createFormData.form_id > 0 ? createFormData.form_id.toString() : ''}
                  onValueChange={(value: string) =>
                    setCreateFormData((prev: CreateTaskInput) => ({ 
                      ...prev, 
                      form_id: value ? parseInt(value) : 0 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a form" />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.filter((form: Form) => form.is_active).map((form: Form) => (
                      <SelectItem key={form.id} value={form.id.toString()}>
                        {form.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assign To</Label>
                <Select
                  value={createFormData.assigned_to > 0 ? createFormData.assigned_to.toString() : ''}
                  onValueChange={(value: string) =>
                    setCreateFormData((prev: CreateTaskInput) => ({ 
                      ...prev, 
                      assigned_to: value ? parseInt(value) : 0 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter((user: User) => user.is_active).map((user: User) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={createFormData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateFormData((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Complete Monthly Safety Audit"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={createFormData.due_date.toISOString().slice(0, 16)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateFormData((prev: CreateTaskInput) => ({ ...prev, due_date: new Date(e.target.value) }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence_type">Recurrence</Label>
                <Select
                  value={createFormData.recurrence_type}
                  onValueChange={(value: 'none' | 'daily' | 'weekly' | 'monthly') =>
                    setCreateFormData((prev: CreateTaskInput) => ({ ...prev, recurrence_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(recurrenceOptions).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {createFormData.recurrence_type !== 'none' && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence_interval">Recurrence Interval</Label>
                  <Input
                    id="recurrence_interval"
                    type="number"
                    min="1"
                    value={createFormData.recurrence_interval || 1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateTaskInput) => ({ 
                        ...prev, 
                        recurrence_interval: parseInt(e.target.value) || 1 
                      }))
                    }
                    placeholder="e.g., 2 for every 2 weeks"
                  />
                </div>
              )}

              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(statusOptions).map(([status, config]) => {
          const count = tasks.filter((task: Task) => task.status === status).length;
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${config.color.split(' ')[0]}`}></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            {filteredTasks.length} of {tasks.length} tasks
            {statusFilter !== 'all' && statusFilter in statusOptions && ` (filtered by ${statusOptions[statusFilter as keyof typeof statusOptions].label})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {tasks.length === 0 
                  ? 'No tasks created yet. Create your first task above!'
                  : 'No tasks match the current filter.'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task: Task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{getFormTitle(task.form_id)}</TableCell>
                    <TableCell>{getUserName(task.assigned_to)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {formatDate(task.due_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusOptions[task.status].color}>
                        {statusOptions[task.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {recurrenceOptions[task.recurrence_type]}
                        {task.recurrence_interval && task.recurrence_type !== 'none' && 
                          ` (${task.recurrence_interval})`
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={task.status}
                        onValueChange={(newStatus: Task['status']) => 
                          handleUpdateTaskStatus(task.id, newStatus)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusOptions).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
