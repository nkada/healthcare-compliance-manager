
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { Form, Task, FormField, CreateFormSubmissionInput } from '../../../server/src/schema';

interface FormViewerProps {
  form: Form;
  task?: Task;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

export function FormViewer({ form, task, onSubmit, onCancel }: FormViewerProps) {
  const [formData, setFormData] = useState<Record<string, string | number | boolean | Date>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stub form fields since the backend doesn't return them yet
  // In a real implementation, these would come from the form.fields relationship
  const formFields: FormField[] = [
    {
      id: 1,
      form_id: form.id,
      field_type: 'text_input',
      field_label: 'Inspector Name',
      field_key: 'inspector_name',
      is_required: true,
      field_options: null,
      field_order: 1,
      created_at: new Date()
    },
    {
      id: 2,
      form_id: form.id,
      field_type: 'date_picker',
      field_label: 'Inspection Date',
      field_key: 'inspection_date',
      is_required: true,
      field_options: null,
      field_order: 2,
      created_at: new Date()
    },
    {
      id: 3,
      form_id: form.id,
      field_type: 'select_dropdown',
      field_label: 'Overall Rating',
      field_key: 'overall_rating',
      is_required: true,
      field_options: JSON.stringify(['Excellent', 'Good', 'Fair', 'Poor']),
      field_order: 3,
      created_at: new Date()
    },
    {
      id: 4,
      form_id: form.id,
      field_type: 'text_area',
      field_label: 'Comments',
      field_key: 'comments',
      is_required: false,
      field_options: null,
      field_order: 4,
      created_at: new Date()
    },
    {
      id: 5,
      form_id: form.id,
      field_type: 'checkbox',
      field_label: 'All safety protocols followed',
      field_key: 'safety_protocols',
      is_required: true,
      field_options: null,
      field_order: 5,
      created_at: new Date()
    }
  ];

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      for (const field of formFields) {
        if (field.is_required && !formData[field.field_key]) {
          alert(`Please fill in the required field: ${field.field_label}`);
          setIsSubmitting(false);
          return;
        }
      }
      
      // Submit form data
      const submissionInput: CreateFormSubmissionInput = {
        form_id: form.id,
        task_id: task?.id || null,
        submission_data: formData
      };
      
      await trpc.createFormSubmission.mutate(submissionInput);
      await onSubmit();
    } catch (error) {
      console.error('Failed to submit form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (fieldKey: string, value: string | number | boolean | Date) => {
    setFormData((prev: Record<string, string | number | boolean | Date>) => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const renderField = (field: FormField) => {
    const value = formData[field.field_key];
    
    switch (field.field_type) {
      case 'text_input':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_key}
              value={(value as string) || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateFormData(field.field_key, e.target.value)
              }
              required={field.is_required}
            />
          </div>
        );
        
      case 'number_input':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_key}
              type="number"
              value={(value as number) || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateFormData(field.field_key, parseFloat(e.target.value) || 0)
              }
              required={field.is_required}
            />
          </div>
        );
        
      case 'text_area':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.field_key}
              value={(value as string) || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateFormData(field.field_key, e.target.value)
              }
              required={field.is_required}
              rows={3}
            />
          </div>
        );
        
      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.field_key}
              checked={(value as boolean) || false}
              onCheckedChange={(checked: boolean) =>
                updateFormData(field.field_key, checked)
              }
            />
            <Label htmlFor={field.field_key} className="text-sm font-normal">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        );
        
      case 'radio_button': {
        const radioOptions = field.field_options ? JSON.parse(field.field_options) : [];
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={(value as string) || ''}
              onValueChange={(newValue: string) => updateFormData(field.field_key, newValue)}
            >
              {radioOptions.map((option: string) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.field_key}_${option}`} />
                  <Label htmlFor={`${field.field_key}_${option}`} className="text-sm font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      }
        
      case 'select_dropdown': {
        const selectOptions = field.field_options ? JSON.parse(field.field_options) : [];
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(newValue: string) => updateFormData(field.field_key, newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }
        
      case 'date_picker':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value as Date), 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={value ? new Date(value as Date) : undefined}
                  onSelect={(date: Date | undefined) => 
                    updateFormData(field.field_key, date || new Date())
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 {form.title}
          </CardTitle>
          {form.description && (
            <CardDescription>{form.description}</CardDescription>
          )}
          {task && (
            <div className="text-sm text-slate-600">
              Task: {task.title} • Due: {task.due_date.toLocaleDateString()}
            </div>
          )}
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmitForm} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-6">
            {formFields
              .sort((a: FormField, b: FormField) => a.field_order - b.field_order)
              .map((field: FormField) => renderField(field))
            }
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Form'}
          </Button>
        </div>
      </form>
    </div>
  );
}
