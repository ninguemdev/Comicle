import { Link } from 'react-router';

import { strings } from '../../strings/pt-BR';
import { buttonClassName } from '../../ui/button';
import { Card } from '../../ui/card';

/** Placeholder until T07 (avatar editor and nickname). */
export function ProfilePage() {
  return (
    <div className="flex flex-col items-start gap-6">
      <h1 className="font-display text-5xl tracking-wide">{strings.profile.title}</h1>
      <Card className="w-full">
        <p className="font-semibold">{strings.profile.comingSoon}</p>
      </Card>
      <Link to="/" className={buttonClassName('ghost')}>
        {strings.navigation.backHome}
      </Link>
    </div>
  );
}
