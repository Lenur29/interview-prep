import { useParams } from 'react-router';

const TopicPage = () => {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  return (
    <h1 className="p-6 text-2xl font-semibold">
      Topic: <span className="font-mono text-accent">{topicSlug}</span>
    </h1>
  );
};

export default TopicPage;
