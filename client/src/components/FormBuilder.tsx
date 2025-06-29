
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, FileText, Edit, Trash2, GripVertical, X, BarChart3 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { FormSubmissionsViewer } from './FormSubmissionsViewer';
import type { Form, CreateFormInput, UpdateFormInput } from '../../../server/src/schema';

interface FormBuilderProps {
  forms: Form[];
  onRefresh: () => Promise<void>;
}

interface FormField {
  field_type: 'text_input' | 'number_input' | 'text_area' | 'checkbox' | 'radio_button' | 'select_dropdown' | 'date_picker';
  field_label: string;
  field_key: string;
  is_required: boolean;
  field_options?: string[];
  field_order: number;
}

export function FormBuilder({ forms, onRefresh }: FormBuilderProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmissionsDialogOpen, setIsSubmissionsDialogOpen] = useState(false);
  const [selectedFormForSubmissions, setSelectedFormForSubmissions] = useState<Form | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    description: string | null;
    tags: string[];
    fields: FormField[];
  }>({
    title: '',
    description: null,
    tags: [],
    fields: []
  });

  const [newTag, setNewTag] = useState('');
  const [newFieldOption, setNewFieldOption] = useState('');

  const fieldTypeLabels = {
    text_input: '📝 Text Input',
    number_input: '🔢 Number Input',
    text_area: '📄 Text Area',
    checkbox: '☑️ Checkbox',
    radio_button: '⚪ Radio Buttons',
    select_dropdown: '📋 Select Dropdown',
    date_picker: '📅 Date Picker'
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: null,
      tags: [],
      fields: []
    });
    setNewTag('');
    setNewFieldOption('');
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const createInput: CreateFormInput = {
        title: formData.title,
        description: formData.description || null,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        fields: formData.fields.map((field: FormField) => ({
          field_type: field.field_type,
          field_label: field.field_label,
          field_key: field.field_key,
          is_required: field.is_required,
          field_options: field.field_options || undefined,
          field_order: field.field_order
        }))
      };
      
      await trpc.createForm.mutate(createInput);
      resetForm();
      setIsCreateDialogOpen(false);
      await onRefresh();
    } catch (error) {
      console.error('Failed to create form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;
    
    setIsLoading(true);
    try {
      const updateInput: UpdateFormInput = {
        id: selectedForm.id,
        title: formData.title,
        description: formData.description || null,
        tags: formData.tags.length > 0 ? formData.tags : undefined
      };
      
      await trpc.updateForm.mutate(updateInput);
      setIsEditDialogOpen(false);
      setSelectedForm(null);
      resetForm();
      await onRefresh();
    } catch (error) {
      console.error('Failed to update form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (form: Form) => {
    setSelectedForm(form);
    setFormData({
      title: form.title,
      description: form.description,
      tags: form.tags ? JSON.parse(form.tags) : [],
      fields: [] // Fields would be loaded from form.fields in real implementation
    });
    setIsEditDialogOpen(true);
  };

  const addField = () => {
    const newField: FormField = {
      field_type: 'text_input',
      field_label: 'New Field',
      field_key: `field_${Date.now()}`,
      is_required: false,
      field_options: [],
      field_order: formData.fields.length + 1
    };
    
    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field: FormField, i: number) => 
        i === index ? { ...field, ...updates } : field
      )
    }));
  };

  const removeField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_: FormField, i: number) => i !== index)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag: string) => tag !== tagToRemove)
    }));
  };

  const addFieldOption = (fieldIndex: number) => {
    if (newFieldOption.trim()) {
      updateField(fieldIndex, {
        field_options: [...(formData.fields[fieldIndex].field_options || []), newFieldOption.trim()]
      });
      setNewFieldOption('');
    }
  };

  const removeFieldOption = (fieldIndex: number, optionIndex: number) => {
    const field = formData.fields[fieldIndex];
    const updatedOptions = field.field_options?.filter((_: string, i: number) => i !== optionIndex) || [];
    updateField(fieldIndex, { field_options: updatedOptions });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Form Builder</h2>
          <p className="text-slate-600">Create and manage compliance forms</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Form</DialogTitle>
              <DialogDescription>
                Build a custom compliance form with various field types
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateForm} className="space-y-6">
              {/* Form Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Form Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g., Monthly Safety Audit"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value || null }))
                    }
                    placeholder="Describe the purpose and requirements of this form"
                    rows={3}
                  />
                </div>
                
                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
                      placeholder="Add tag (e.g., safety, audit, monthly)"
                      onKeyPress={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Form Fields</Label>
                  <Button type="button" variant="outline" onClick={addField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>

                {formData.fields.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fields added yet. Click "Add Field" to start building your form.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.fields.map((field: FormField, index: number) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-slate-400" />
                              <span className="font-medium">Field {index + 1}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Field Type</Label>
                              <Select
                                value={field.field_type}
                                onValueChange={(value: FormField['field_type']) =>
                                  updateField(index, { field_type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(fieldTypeLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Field Label</Label>
                              <Input
                                value={field.field_label}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateField(index, { field_label: e.target.value })
                                }
                                placeholder="Enter field label"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Field Key</Label>
                              <Input
                                value={field.field_key}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateField(index, { field_key: e.target.value })
                                }
                                placeholder="field_key"
                              />
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                              <Switch
                                checked={field.is_required}
                                onCheckedChange={(checked: boolean) =>
                                  updateField(index, { is_required: checked })
                                }
                              />
                              <Label>Required Field</Label>
                            </div>
                          </div>

                          {/* Options for radio buttons and select dropdowns */}
                          {(field.field_type === 'radio_button' || field.field_type === 'select_dropdown') && (
                            <div className="space-y-2">
                              <Label>Options</Label>
                              <div className="space-y-2">
                                {field.field_options?.map((option: string, optionIndex: number) => (
                                  <div key={optionIndex} className="flex items-center gap-2">
                                    <Input value={option} readOnly />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFieldOption(index, optionIndex)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <Input
                                    value={newFieldOption}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                      setNewFieldOption(e.target.value)
                                    }
                                    placeholder="Add option"
                                    onKeyPress={(e: React.KeyboardEvent) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addFieldOption(index);
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => addFieldOption(index)}
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Form'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Forms List */}
      <div className="grid gap-6">
        {forms.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300">
            <CardContent className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Forms Created Yet</h3>
              <p className="text-slate-500 mb-4">
                Create your first compliance form to start managing organizational requirements
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Form
              </Button>
            </CardContent>
          </Card>
        ) : (
          forms.map((form: Form) => (
            <Card key={form.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {form.title}
                    </CardTitle>
                    {form.description && (
                      <CardDescription>{form.description}</CardDescription>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={form.is_active ? 'default' : 'secondary'}>
                        {form.is_active ? '✅ Active' : '⏸️ Inactive'}
                      </Badge>
                      {form.tags && JSON.parse(form.tags).map((tag: string) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFormForSubmissions(form);
                        setIsSubmissionsDialogOpen(true);
                      }}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Submissions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(form)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-slate-500">
                  <span>Created: {form.created_at.toLocaleDateString()}</span>
                  <span>Last updated: {form.updated_at.toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Form Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Form</DialogTitle>
            <DialogDescription>
              Update form details and settings
            </DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <form onSubmit={handleEditForm} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_title">Form Title</Label>
                <Input
                  id="edit_title"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value || null }))
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    onKeyPress={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Form'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Submissions Viewer Dialog */}
      <Dialog open={isSubmissionsDialogOpen} onOpenChange={setIsSubmissionsDialogOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Submissions</DialogTitle>
            <DialogDescription>
              View all submissions for the selected form
            </DialogDescription>
          </DialogHeader>
          {selectedFormForSubmissions && (
            <FormSubmissionsViewer
              formId={selectedFormForSubmissions.id}
              onClose={() => {
                setIsSubmissionsDialogOpen(false);
                setSelectedFormForSubmissions(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
