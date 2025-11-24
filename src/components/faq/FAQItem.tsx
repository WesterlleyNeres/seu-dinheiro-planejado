import { Link } from 'react-router-dom';
import { AlertCircle, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FAQItem as FAQItemType } from '@/types/faq';

interface FAQItemProps {
  item: FAQItemType;
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    color: 'text-destructive',
    badgeVariant: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    badgeVariant: 'secondary' as const,
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    badgeVariant: 'outline' as const,
  },
};

export const FAQItem = ({ item }: FAQItemProps) => {
  const { icon: Icon, color, badgeVariant } = severityConfig[item.severity];

  return (
    <AccordionItem value={item.id} className="border-b border-border">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-start gap-3 text-left">
          <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${color}`} />
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{item.question}</h3>
            <Badge variant={badgeVariant} className="mt-1">
              {item.category}
            </Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pl-8">
        <div className="space-y-4">
          {/* Answer */}
          <div className="prose prose-sm text-muted-foreground">
            {item.answer.split('\n\n').map((paragraph, i) => (
              <p key={i} className="mb-2 last:mb-0">
                {paragraph.split('**').map((part, j) =>
                  j % 2 === 0 ? (
                    <span key={j}>{part}</span>
                  ) : (
                    <strong key={j} className="font-semibold text-foreground">
                      {part}
                    </strong>
                  )
                )}
              </p>
            ))}
          </div>

          {/* Solution Steps */}
          {item.solution && item.solution.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <h4 className="mb-2 font-semibold text-foreground">Como resolver:</h4>
              <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
                {item.solution.map((step, i) => (
                  <li key={i}>
                    {step.split('**').map((part, j) =>
                      j % 2 === 0 ? (
                        <span key={j}>{part}</span>
                      ) : (
                        <strong key={j} className="font-medium text-foreground">
                          {part}
                        </strong>
                      )
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Related Links */}
          {item.relatedLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.relatedLinks.map((link, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-1"
                >
                  <Link to={link.path}>
                    <ExternalLink className="h-3 w-3" />
                    {link.label}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
