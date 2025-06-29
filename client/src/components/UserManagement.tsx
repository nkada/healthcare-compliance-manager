
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserCheck, UserX, Edit } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, UpdateUserInput } from '../../../server/src/schema';

interface UserManagementProps {
  users: User[];
  onRefresh: () => Promise<void>;
}

export function UserManagement({ users, onRefresh }: UserManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [createFormData, setCreateFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'standard_user'
  });

  const [editFormData, setEditFormData] = useState<Partial<UpdateUserInput>>({});

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createUser.mutate(createFormData);
      setCreateFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'standard_user'
      });
      setIsCreateDialogOpen(false);
      await onRefresh();
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      await trpc.updateUser.mutate({
        id: selectedUser.id,
        ...editFormData
      } as UpdateUserInput);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      setEditFormData({});
      await onRefresh();
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleUserStatus = async (user: User) => {
    setIsLoading(true);
    try {
      await trpc.updateUser.mutate({
        id: user.id,
        is_active: !user.is_active
      });
      await onRefresh();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-600">Manage team members and their roles</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new team member account with appropriate role and permissions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={createFormData.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateUserInput) => ({ ...prev, first_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={createFormData.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateUserInput) => ({ ...prev, last_name: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={createFormData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={createFormData.role || 'standard_user'}
                  onValueChange={(value: 'admin' | 'standard_user') =>
                    setCreateFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard_user">👤 Standard User</SelectItem>
                    <SelectItem value="admin">👨‍💼 Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {users.length} total users • {users.filter(u => u.is_active).length} active
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found. Create your first team member account.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? '👨‍💼 Admin' : '👤 User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => handleToggleUserStatus(user)}
                          disabled={isLoading}
                        />
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? (
                            <>
                              <UserCheck className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {user.created_at.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={editFormData.first_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: Partial<UpdateUserInput>) => ({ ...prev, first_name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={editFormData.last_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: Partial<UpdateUserInput>) => ({ ...prev, last_name: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email Address</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: Partial<UpdateUserInput>) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_role">Role</Label>
                <Select
                  value={editFormData.role || 'standard_user'}
                  onValueChange={(value: 'admin' | 'standard_user') =>
                    setEditFormData((prev: Partial<UpdateUserInput>) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard_user">👤 Standard User</SelectItem>
                    <SelectItem value="admin">👨‍💼 Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_is_active"
                  checked={editFormData.is_active ?? true}
                  onCheckedChange={(checked: boolean) =>
                    setEditFormData((prev: Partial<UpdateUserInput>) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="edit_is_active">Active User</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update User'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
