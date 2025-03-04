interface FeedbackDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    isError?: boolean;
    confirmButtonText?: string;
}
declare const FeedbackDialog: React.FC<FeedbackDialogProps>;
export default FeedbackDialog;
