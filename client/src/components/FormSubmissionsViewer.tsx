import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { FileText, User, Calendar, X, Eye } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { FormSubmissionWithDetails } from '../../../server/src/schema';

interface FormSubmissionsViewerProps {
  formId: number;
  onClose: () => void;
}

export function FormSubmissionsViewer({ formId, onClose }: FormSubmissionsViewerProps) {
  const [selectedDataDialog, setSelectedDataDialog] = useState<{
    open: boolean;
    data: Record<string, unknown> | null;
    submissionId: number | null;
  }>({ open: false, data: null, submissionId: null });

  const [submissions, setSubmissions] = useState<FormSubmissionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await trpc.getFormSubmissions.query({ formId });
        setSubmissions(result);
      } catch (err) {
        console.error('Failed to load submissions:', err);
        setError(err instanceof Error ? err : new Error('Failed to load submissions'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmissions();
  }, [formId]);

  const openDataDialog = (submissionData: Record<string, unknown>, submissionId: number) => {
    setSelectedDataDialog({
      open: true,
      data: submissionData,
      submissionId
    });
  };

  const closeDataDialog = () => {
    setSelectedDataDialog({ open: false, data: null, submissionId: null });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-600">Loading submissions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardContent className="py-12 text-center">
          <div className="text-red-600 mb-2">⚠️ Error Loading Submissions</div>
          <p className="text-slate-600 mb-4">
            Failed to load form submissions. Please try again.
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Form Submissions
              </CardTitle>
              <CardDescription>
                No submissions have been made for this form yet
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">No submissions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Form Submissions
              </CardTitle>
              <CardDescription>
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''} for "{submissions[0]?.formDetails.title}"
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission: FormSubmissionWithDetails) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">
                      #{submission.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {submission.submittedByUser.first_name} {submission.submittedByUser.last_name}
                          </span>
                          <span className="text-sm text-slate-500">
                            {submission.submittedByUser.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div className="flex flex-col">
                          <span>
                            {submission.submitted_at.toLocaleDateString()}
                          </span>
                          <span className="text-sm text-slate-500">
                            {submission.submitted_at.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDataDialog(submission.submission_data, submission.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Data
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Data Viewer Dialog */}
      <Dialog open={selectedDataDialog.open} onOpenChange={(open) => !open && closeDataDialog()}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Submission Data - #{selectedDataDialog.submissionId}
            </DialogTitle>
            <DialogDescription>
              Form responses and submitted data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-700 uppercase tracking-wide">
                Submitted Data
              </h4>
              <div className="bg-slate-50 rounded-lg p-4 border">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap overflow-x-auto">
                  {selectedDataDialog.data ? 
                    JSON.stringify(selectedDataDialog.data, null, 2) : 
                    'No data available'
                  }
                </pre>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={closeDataDialog}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}