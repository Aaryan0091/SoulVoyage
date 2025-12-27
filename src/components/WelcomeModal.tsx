import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WelcomeModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ isOpen, onStartTour, onSkip }: WelcomeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onSkip}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
              <span className="text-4xl">🌍</span>
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center">Welcome to SoulVoyage!</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Your journey begins here. Take a quick tour to discover all the amazing features waiting for you.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/20">
            <span className="text-2xl">💬</span>
            <p className="text-sm">Connect with friends through direct messages</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/20">
            <span className="text-2xl">🌐</span>
            <p className="text-sm">Join communities and servers</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/20">
            <span className="text-2xl">✈️</span>
            <p className="text-sm">Plan and manage trips with friends</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={onStartTour}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            size="lg"
          >
            Start Tour
          </Button>
          <Button
            onClick={onSkip}
            variant="ghost"
            className="w-full"
            size="lg"
          >
            Skip for now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
